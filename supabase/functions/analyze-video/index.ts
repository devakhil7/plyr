import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate simulated goal timestamps for MVP
// In production, this would use actual video analysis
function generateSimulatedGoals(videoDurationMinutes: number = 90): Array<{timestamp_seconds: number, description: string}> {
  const goals = [];
  const numGoals = Math.floor(Math.random() * 4) + 1; // 1-4 goals
  const totalSeconds = videoDurationMinutes * 60;
  
  const descriptions = [
    "Goal from close range after a through ball",
    "Header from a corner kick",
    "Long-range strike into the top corner",
    "Penalty kick converted",
    "Counter-attack finish",
    "Free kick curled around the wall",
    "Tap-in from a cross",
    "Solo run and finish",
  ];
  
  const usedTimestamps = new Set<number>();
  
  for (let i = 0; i < numGoals; i++) {
    let timestamp: number;
    do {
      // Generate random timestamp between 5 minutes and near end of video
      timestamp = Math.floor(Math.random() * (totalSeconds - 600)) + 300;
      // Round to nearest 30 seconds for realism
      timestamp = Math.round(timestamp / 30) * 30;
    } while (usedTimestamps.has(timestamp));
    
    usedTimestamps.add(timestamp);
    goals.push({
      timestamp_seconds: timestamp,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
    });
  }
  
  // Sort by timestamp
  goals.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  
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
    
    if (!jobId) {
      throw new Error("Job ID is required");
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    // Simulate processing time for realism
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate simulated goals
    // For MVP, we generate realistic dummy data
    // In production, this would use actual AI video analysis
    const goals = generateSimulatedGoals(45); // Assume ~45 min video

    console.log("Generated simulated goals:", goals);

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
      clipsCreated: clips.length,
      note: "Using simulated analysis for MVP"
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
