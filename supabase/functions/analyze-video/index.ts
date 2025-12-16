import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoEvent {
  event_type: 'goal' | 'shot' | 'pass';
  timestamp_seconds: number;
  confidence: number;
  description: string;
}

interface AnalysisResult {
  goals: VideoEvent[];
  shots: VideoEvent[];
  passes: VideoEvent[];
  goals_count: number;
  shots_count: number;
  passes_count: number;
}

// Analyze video frames using Gemini Vision
async function analyzeFramesWithGemini(
  frames: { timestamp: number; data: string }[],
  videoDuration: number
): Promise<AnalysisResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  console.log(`Analyzing ${frames.length} frames from ${videoDuration}s video...`);

  // Build the message with all frames
  const frameDescriptions = frames.map((f, i) => 
    `Frame ${i + 1} at ${f.timestamp.toFixed(1)}s`
  ).join(', ');

  const content: any[] = [
    {
      type: "text",
      text: `You are an expert football/soccer video analyst. Analyze these ${frames.length} frames from a ${Math.round(videoDuration)} second match video.

FRAMES TIMELINE: ${frameDescriptions}

For each frame, carefully look for:
1. GOALS: Ball crossing the goal line into the net, goalkeeper beaten, celebration scenes
2. SHOTS: Player striking the ball towards goal (shooting motion, ball trajectory towards goal)
3. PASSES: Ball being passed between players (controlled ball movement from one player to another)

IMPORTANT RULES:
- Only report events you can ACTUALLY SEE in the frames
- Each event must have a specific timestamp (use the nearest frame's timestamp)
- Be conservative - only report events with high confidence
- A goal implies a shot happened, but count them separately
- Look for visual cues: ball position, player postures, goalkeeper movement

Return ONLY a valid JSON object with this exact structure:
{
  "goals": [{"timestamp_seconds": <number>, "confidence": <0.0-1.0>, "description": "<what you see>"}],
  "shots": [{"timestamp_seconds": <number>, "confidence": <0.0-1.0>, "description": "<what you see>"}],
  "passes": [{"timestamp_seconds": <number>, "confidence": <0.0-1.0>, "description": "<what you see>"}]
}

If you cannot detect any events of a type, use an empty array [].`
    }
  ];

  // Add each frame as an image
  for (const frame of frames) {
    content.push({
      type: "image_url",
      image_url: {
        url: frame.data.startsWith('data:') ? frame.data : `data:image/jpeg;base64,${frame.data}`
      }
    });
  }

  console.log("Calling Gemini Vision for frame analysis...");

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
          content: 'You are an expert football video analyst. Analyze the provided video frames and identify specific events. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: content
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini error:", response.status, errorText);
    
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

  console.log("Gemini Response:", responseContent);

  // Parse the JSON response
  let analysis: { goals: any[]; shots: any[]; passes: any[] };
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
    analysis = JSON.parse(cleanedContent.trim());
    
    if (!analysis.goals) analysis.goals = [];
    if (!analysis.shots) analysis.shots = [];
    if (!analysis.passes) analysis.passes = [];
  } catch (parseError) {
    console.error("Failed to parse AI response:", responseContent);
    // Return empty results if parsing fails
    analysis = { goals: [], shots: [], passes: [] };
  }

  // Validate and format events
  const formatEvents = (events: any[], type: 'goal' | 'shot' | 'pass'): VideoEvent[] => {
    if (!Array.isArray(events)) return [];
    return events
      .filter(e => typeof e.timestamp_seconds === 'number')
      .map(e => ({
        event_type: type,
        timestamp_seconds: Math.round(e.timestamp_seconds),
        confidence: typeof e.confidence === 'number' ? e.confidence : 0.8,
        description: e.description || `${type} detected`
      }));
  };

  const goals = formatEvents(analysis.goals, 'goal');
  const shots = formatEvents(analysis.shots, 'shot');
  const passes = formatEvents(analysis.passes, 'pass');

  return {
    goals,
    shots,
    passes,
    goals_count: goals.length,
    shots_count: shots.length,
    passes_count: passes.length
  };
}

// Authenticate the user and verify job ownership
async function authenticateAndVerifyOwnership(
  req: Request, 
  jobId: string, 
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Unauthorized: No authorization header provided');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error('Auth error:', authError);
    throw new Error('Unauthorized: Invalid token');
  }

  const { data: job, error: jobError } = await supabase
    .from('video_analysis_jobs')
    .select('user_id')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    console.error('Job lookup error:', jobError);
    throw new Error('Job not found');
  }

  if (job.user_id !== user.id) {
    console.error(`User ${user.id} attempted to access job owned by ${job.user_id}`);
    throw new Error('Access denied: You do not own this job');
  }

  console.log(`User ${user.id} authenticated and verified as owner of job ${jobId}`);
  return user.id;
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
    const frames = body.frames || []; // Array of { timestamp: number, data: string (base64) }

    if (!jobId) {
      throw new Error('Missing required parameter: jobId');
    }

    if (!frames || frames.length === 0) {
      throw new Error('Missing required parameter: frames. Please provide video frames for analysis.');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate and verify ownership before proceeding
    await authenticateAndVerifyOwnership(req, jobId, supabaseUrl, supabaseServiceKey);

    console.log(`Starting video analysis for job: ${jobId} with ${frames.length} frames`);

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

    // Analyze frames with Gemini Vision
    const analysis = await analyzeFramesWithGemini(frames, videoDuration);
    console.log(`Analysis complete: ${analysis.goals_count} goals, ${analysis.shots_count} shots, ${analysis.passes_count} passes`);

    await supabase
      .from('video_analysis_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    // Store video events
    const allEvents = [...analysis.goals, ...analysis.shots, ...analysis.passes];
    if (allEvents.length > 0) {
      const eventsToInsert = allEvents.map(event => ({
        video_analysis_job_id: jobId,
        event_type: event.event_type,
        timestamp_seconds: event.timestamp_seconds,
        confidence: event.confidence,
        description: event.description,
      }));

      const { error: eventsError } = await supabase
        .from('video_events')
        .insert(eventsToInsert);

      if (eventsError) {
        console.error("Error storing events:", eventsError);
      }
    }

    // Create highlight clips for goals (as before, for backward compatibility)
    const clips = analysis.goals.map((goal, index) => ({
      video_analysis_job_id: jobId,
      match_id: job.match_id,
      goal_timestamp_seconds: goal.timestamp_seconds,
      start_time_seconds: Math.max(0, goal.timestamp_seconds - 10),
      end_time_seconds: Math.min(videoDuration, goal.timestamp_seconds + 5),
      caption: `Goal ${index + 1}: ${goal.description}`,
      is_selected: true,
      clip_video_url: job.video_url,
    }));

    if (clips.length > 0) {
      const { error: clipsError } = await supabase
        .from('highlight_clips')
        .insert(clips);

      if (clipsError) {
        console.error("Error creating clips:", clipsError);
      }
    }

    // Update job with metrics
    await supabase
      .from('video_analysis_jobs')
      .update({ 
        status: 'completed', 
        updated_at: new Date().toISOString(),
        goals_count: analysis.goals_count,
        shots_count: analysis.shots_count,
        passes_count: analysis.passes_count,
        analysis_metadata: {
          analyzed_frames: frames.length,
          video_duration: videoDuration,
          analyzed_at: new Date().toISOString()
        }
      })
      .eq('id', jobId);

    console.log(`Analysis completed. Detected ${allEvents.length} total events`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: {
          goals_count: analysis.goals_count,
          shots_count: analysis.shots_count,
          passes_count: analysis.passes_count,
          goals: analysis.goals,
          shots: analysis.shots,
          passes: analysis.passes,
        },
        clipsCreated: clips.length,
        message: `Detected ${analysis.goals_count} goals, ${analysis.shots_count} shots, ${analysis.passes_count} passes`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Video analysis error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;
    
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid token')) {
      statusCode = 401;
    } else if (errorMessage.includes('Access denied') || errorMessage.includes('do not own')) {
      statusCode = 403;
    } else if (errorMessage.includes('not found')) {
      statusCode = 404;
    }

    if (jobId && statusCode === 500) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await supabase
          .from('video_analysis_jobs')
          .update({ 
            status: 'failed', 
            error_message: errorMessage,
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
        error: errorMessage
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});