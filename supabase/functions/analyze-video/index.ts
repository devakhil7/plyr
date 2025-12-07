import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let jobId: string | undefined;

  try {
    const body = await req.json();
    jobId = body.jobId;
    const videoDurationSeconds = body.videoDuration;
    
    if (!jobId) {
      throw new Error("Job ID is required");
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get the job details
    const { data: job, error: jobError } = await supabase
      .from('video_analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    console.log("Starting REAL video analysis for job:", jobId, "video:", job.video_url, "duration:", videoDurationSeconds);

    // Update status to analyzing
    await supabase
      .from('video_analysis_jobs')
      .update({ status: 'analyzing' })
      .eq('id', jobId);

    const duration = videoDurationSeconds || 600;
    const durationMinutes = Math.floor(duration / 60);

    // Use Gemini's vision capabilities to analyze the actual video
    const analysisPrompt = `You are an expert sports video analyst. I'm providing you with a football/soccer match video to analyze.

VIDEO URL: ${job.video_url}
VIDEO DURATION: ${durationMinutes} minutes (${Math.round(duration)} seconds)

TASK: Watch and analyze this video carefully. Identify all moments where a GOAL is scored. For each goal, provide:
1. The exact timestamp (in seconds from the start of the video)
2. A description of how the goal was scored
3. Your confidence level

IMPORTANT RULES:
- Only report ACTUAL goals you can see in the video
- Timestamps must be between 0 and ${Math.round(duration)} seconds
- If you cannot access or view the video, return an empty array []
- A goal is when the ball clearly crosses the goal line into the net
- Include near-misses or saves only if the ball actually goes in
- Look for celebrations, scoreboard changes, or replays as confirmation

Return your response as a JSON array with this exact format:
[
  {
    "timestamp_seconds": <exact second when goal occurs>,
    "description": "Description of the goal (e.g., 'Left-footed shot from outside the box into the top corner')",
    "confidence": "high" | "medium" | "low"
  }
]

If no goals are found in the video, return an empty array: []
Only return the JSON array, no other text.`;

    console.log("Calling Gemini Vision via Lovable AI for REAL video analysis...");

    // Use Gemini 2.5 Pro for better video understanding
    const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: 'You are an expert sports video analyst AI. You can view and analyze video content. Always respond with valid JSON only. Be precise about timestamps.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt
              },
              {
                type: 'video_url',
                video_url: {
                  url: job.video_url
                }
              }
            ]
          }
        ],
      }),
    });

    if (!lovableResponse.ok) {
      const errorText = await lovableResponse.text();
      console.error("Lovable AI error:", lovableResponse.status, errorText);
      
      if (lovableResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (lovableResponse.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue.");
      }
      
      // If video analysis fails, try with just text prompt as fallback
      console.log("Video analysis failed, trying text-based fallback...");
      throw new Error(`Video analysis error: ${lovableResponse.status} - ${errorText}`);
    }

    const aiData = await lovableResponse.json();
    console.log("Gemini response received:", JSON.stringify(aiData).substring(0, 500));

    const responseContent = aiData.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response content from AI");
    }

    // Parse the JSON response
    let goals: GoalDetection[];
    try {
      // Clean the response - remove markdown code blocks if present
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
        console.error("Response is not an array:", cleanedContent);
        goals = [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseContent);
      throw new Error("Failed to parse goal detection response");
    }

    console.log("Detected goals from video analysis:", goals);

    // Validate and clamp timestamps to video duration
    goals = goals
      .filter(goal => goal.timestamp_seconds >= 0 && goal.timestamp_seconds <= duration)
      .map(goal => ({
        ...goal,
        timestamp_seconds: Math.round(goal.timestamp_seconds)
      }));

    // Update status to processing (creating clips)
    await supabase
      .from('video_analysis_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    // Create highlight clips for each goal
    const clips = goals.map((goal) => ({
      video_analysis_job_id: jobId,
      match_id: job.match_id,
      goal_timestamp_seconds: goal.timestamp_seconds,
      start_time_seconds: Math.max(0, goal.timestamp_seconds - 10),
      end_time_seconds: Math.min(duration, goal.timestamp_seconds + 5),
      caption: goal.description || `Goal at ${Math.floor(goal.timestamp_seconds / 60)}:${String(goal.timestamp_seconds % 60).padStart(2, '0')}`,
      is_selected: goal.confidence === 'high',
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

    // Update job status to completed
    await supabase
      .from('video_analysis_jobs')
      .update({ status: 'completed' })
      .eq('id', jobId);

    console.log("REAL video analysis completed. Found", goals.length, "actual goals");

    return new Response(JSON.stringify({ 
      success: true, 
      goalsFound: goals.length,
      clipsCreated: clips.length,
      goals: goals,
      videoDuration: duration,
      analysisType: "real_video_analysis",
      note: "Actual video analyzed using Gemini Vision"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in analyze-video function:", error);
    
    // Try to update job status to failed
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
            error_message: error instanceof Error ? error.message : 'Unknown error' 
          })
          .eq('id', jobId);
      } catch (e) {
        console.error("Failed to update job status:", e);
      }
    }

    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
