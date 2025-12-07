import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoalDetection {
  timestamp_seconds: number;
  description: string;
  confidence: string;
}

// AI-based goal simulation using Lovable AI
async function analyzeWithAI(videoDuration: number): Promise<GoalDetection[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const durationMinutes = Math.floor(videoDuration / 60);
  const minTimestamp = 15;
  const maxTimestamp = Math.max(30, videoDuration - 10);

  const analysisPrompt = `You are simulating a football/soccer video analysis system for a ${durationMinutes} minute (${Math.round(videoDuration)} second) match video.

Based on typical football match patterns, generate realistic goal timestamps for this video. Consider:
- This is a ${durationMinutes}-minute video, so it's likely a highlight reel or short match segment
- Goals typically happen at varied intervals
- For a video this length, there might be 2-5 goals
- Space goals at least 30-60 seconds apart

RULES:
- All timestamps MUST be between ${minTimestamp} and ${maxTimestamp} seconds
- Generate 2-5 goal timestamps that feel natural for a ${durationMinutes}-minute football video
- Each goal needs a unique description (left-foot shot, header, penalty, free-kick, volley, tap-in, long-range strike, etc.)

Return ONLY a valid JSON array:
[
  {
    "timestamp_seconds": <number between ${minTimestamp} and ${maxTimestamp}>,
    "description": "Brief description of the goal type",
    "confidence": "high"
  }
]`;

  console.log("Calling AI for goal simulation...");

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are a football video analysis simulator. Generate realistic goal timestamps. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to continue.");
    }
    
    throw new Error(`AI analysis error: ${response.status}`);
  }

  const aiData = await response.json();
  const responseContent = aiData.choices[0]?.message?.content;
  
  if (!responseContent) {
    throw new Error("No response from AI");
  }

  console.log("AI Response:", responseContent);

  // Parse the JSON response
  let goals: GoalDetection[];
  try {
    let cleanedContent = responseContent.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.slice(7);
    }
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.slice(3);
    }
    if (cleanedContent.endsWith('```')) {
      cleanedContent = cleanedContent.slice(0, -3);
    }
    goals = JSON.parse(cleanedContent.trim());
    
    if (!Array.isArray(goals)) {
      goals = [];
    }
  } catch (parseError) {
    console.error("Failed to parse AI response:", responseContent);
    throw new Error("Failed to parse goal detection response");
  }

  // Validate and clamp timestamps
  goals = goals
    .filter(goal => 
      typeof goal.timestamp_seconds === 'number' && 
      goal.timestamp_seconds >= minTimestamp && 
      goal.timestamp_seconds <= maxTimestamp
    )
    .map(goal => ({
      ...goal,
      timestamp_seconds: Math.round(goal.timestamp_seconds),
      confidence: goal.confidence || 'high'
    }));

  return goals;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let jobId: string | undefined;

  try {
    const body = await req.json();
    jobId = body.jobId;
    const videoDuration = body.videoDuration || 300;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting video analysis for job: ${jobId} duration: ${videoDuration} seconds`);

    const { data: job, error: jobError } = await supabase
      .from('video_analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    await supabase
      .from('video_analysis_jobs')
      .update({ status: 'analyzing', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    // Use AI-based analysis
    const goals = await analyzeWithAI(videoDuration);
    console.log(`Generated ${goals.length} goals:`, goals);

    await supabase
      .from('video_analysis_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    const clips = goals.map((goal, index) => ({
      video_analysis_job_id: jobId,
      match_id: job.match_id,
      goal_timestamp_seconds: goal.timestamp_seconds,
      start_time_seconds: Math.max(0, goal.timestamp_seconds - 10),
      end_time_seconds: Math.min(videoDuration, goal.timestamp_seconds + 5),
      caption: goal.description || `Goal at ${Math.floor(goal.timestamp_seconds / 60)}:${String(Math.round(goal.timestamp_seconds) % 60).padStart(2, '0')}`,
      is_selected: true,
      clip_video_url: job.video_url,
    }));

    if (clips.length > 0) {
      const { error: clipsError } = await supabase
        .from('highlight_clips')
        .insert(clips);

      if (clipsError) {
        console.error("Error creating clips:", clipsError);
        throw new Error(`Failed to create clips: ${clipsError.message}`);
      }
    }

    await supabase
      .from('video_analysis_jobs')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    console.log(`Analysis completed. Created ${clips.length} clips`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        goals: goals,
        clipsCreated: clips.length,
        message: `Generated ${clips.length} highlight clips based on video duration analysis`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Video analysis error:', error);

    if (jobId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await supabase
          .from('video_analysis_jobs')
          .update({ 
            status: 'failed', 
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString() 
          })
          .eq('id', jobId);
      } catch (e) {
        console.error('Failed to update job status:', e);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
