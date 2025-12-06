import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    if (!jobId) {
      throw new Error("Job ID is required");
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    console.log("Starting analysis for job:", jobId, "video:", job.video_url);

    // Update status to analyzing
    await supabase
      .from('video_analysis_jobs')
      .update({ status: 'analyzing' })
      .eq('id', jobId);

    // Call Gemini to analyze the video
    // Note: Gemini can process video URLs directly
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are a sports video analyst AI. Your task is to watch football/soccer match videos and identify the exact timestamps when goals are scored.

For each goal you detect, provide the timestamp in seconds from the start of the video.

IMPORTANT: 
- Only include actual goals, not near-misses or saved shots
- Be as precise as possible with the timing
- The timestamp should be the moment the ball crosses the goal line
- If you cannot analyze the video or no goals are found, return an empty array

You MUST respond with valid JSON only, in this exact format:
{
  "goals": [
    {"timestamp_seconds": 123, "description": "Goal by Team A, header from corner"},
    {"timestamp_seconds": 845, "description": "Goal by Team B, long range shot"}
  ]
}

If no goals are detected or you cannot process the video, respond with:
{"goals": []}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this football match video and identify all goal timestamps. Return the results as JSON."
              },
              {
                type: "image_url",
                image_url: {
                  url: job.video_url
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        await supabase
          .from('video_analysis_jobs')
          .update({ status: 'failed', error_message: 'Rate limit exceeded. Please try again later.' })
          .eq('id', jobId);
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        await supabase
          .from('video_analysis_jobs')
          .update({ status: 'failed', error_message: 'Payment required. Please add credits.' })
          .eq('id', jobId);
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response received:", JSON.stringify(aiResponse));

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let goals = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        goals = parsed.goals || [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, "Content:", content);
      // If parsing fails, we'll continue with empty goals
    }

    console.log("Detected goals:", goals);

    // Update status to processing (creating clips)
    await supabase
      .from('video_analysis_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    // Create highlight clips for each goal
    const clips = goals.map((goal: { timestamp_seconds: number; description?: string }) => ({
      video_analysis_job_id: jobId,
      match_id: job.match_id,
      goal_timestamp_seconds: goal.timestamp_seconds,
      start_time_seconds: Math.max(0, goal.timestamp_seconds - 10),
      end_time_seconds: goal.timestamp_seconds + 5,
      caption: goal.description || `Goal at ${Math.floor(goal.timestamp_seconds / 60)}:${String(goal.timestamp_seconds % 60).padStart(2, '0')}`,
      is_selected: true,
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

    console.log("Analysis completed. Created", clips.length, "highlight clips");

    return new Response(JSON.stringify({ 
      success: true, 
      goalsFound: goals.length,
      clipsCreated: clips.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in analyze-video function:", error);
    
    // Try to update job status to failed
    try {
      const { jobId } = await req.clone().json();
      if (jobId) {
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
      }
    } catch (e) {
      console.error("Failed to update job status:", e);
    }

    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
