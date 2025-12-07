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

    // Download the video file
    console.log("Downloading video from:", job.video_url);
    const videoResponse = await fetch(job.video_url);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }
    
    const videoBuffer = await videoResponse.arrayBuffer();
    // Convert to base64 using btoa
    const bytes = new Uint8Array(videoBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const videoBase64 = btoa(binary);
    
    // Get the content type
    const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
    const videoSizeBytes = videoBuffer.byteLength;
    console.log("Video downloaded, size:", videoSizeBytes, "bytes, type:", contentType);

    // Check if video is too large (Gemini has limits)
    const maxSizeMB = 20; // 20MB limit for inline data
    const videoSizeMB = videoSizeBytes / (1024 * 1024);
    
    if (videoSizeMB > maxSizeMB) {
      console.log(`Video too large (${videoSizeMB.toFixed(2)}MB), using text-based analysis`);
      throw new Error(`Video file too large for analysis (${videoSizeMB.toFixed(1)}MB). Please upload a shorter video under 20MB.`);
    }

    const analysisPrompt = `You are an expert sports video analyst. Analyze this football/soccer video carefully.

VIDEO DURATION: ${durationMinutes} minutes (${Math.round(duration)} seconds)

TASK: Watch this video frame by frame and identify all moments where a GOAL is scored. For each goal:
1. Provide the exact timestamp in seconds from the start
2. Describe how the goal was scored
3. Rate your confidence

IMPORTANT:
- Only report ACTUAL goals visible in the video
- Timestamps must be between 0 and ${Math.round(duration)} seconds
- A goal = ball clearly crossing the goal line into the net
- Look for: ball hitting net, celebrations, scoreboard changes, replays
- If no clear goals are found, return an empty array []

Return ONLY a JSON array:
[
  {
    "timestamp_seconds": <exact second>,
    "description": "How the goal was scored",
    "confidence": "high" | "medium" | "low"
  }
]

If no goals found, return: []`;

    console.log("Calling Gemini Vision with video data...");

    // Use Gemini with inline video data
    const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${contentType};base64,${videoBase64}`
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
      
      throw new Error(`Video analysis error: ${lovableResponse.status}`);
    }

    const aiData = await lovableResponse.json();
    console.log("Gemini response received");

    const responseContent = aiData.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response content from AI");
    }

    console.log("AI Response:", responseContent.substring(0, 500));

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
        console.error("Response is not an array:", cleanedContent);
        goals = [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseContent);
      throw new Error("Failed to parse goal detection response");
    }

    console.log("Detected goals from video analysis:", goals);

    // Validate and clamp timestamps
    goals = goals
      .filter(goal => goal.timestamp_seconds >= 0 && goal.timestamp_seconds <= duration)
      .map(goal => ({
        ...goal,
        timestamp_seconds: Math.round(goal.timestamp_seconds)
      }));

    // Update status to processing
    await supabase
      .from('video_analysis_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    // Create highlight clips
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

    console.log("Video analysis completed. Found", goals.length, "goals");

    return new Response(JSON.stringify({ 
      success: true, 
      goalsFound: goals.length,
      clipsCreated: clips.length,
      goals: goals,
      videoDuration: duration,
      videoSizeMB: videoSizeMB.toFixed(2),
      analysisType: "real_video_analysis"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in analyze-video function:", error);
    
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
