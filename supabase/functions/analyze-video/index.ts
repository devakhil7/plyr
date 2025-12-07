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

// Get Google OAuth2 access token from service account
async function getGoogleAccessToken(serviceAccountKey: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: exp,
  };

  const encode = (obj: any) => {
    const str = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(str);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pemContent = serviceAccountKey.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Start Video Intelligence API annotation
async function startVideoAnnotation(videoUrl: string, accessToken: string): Promise<string> {
  const response = await fetch(
    "https://videointelligence.googleapis.com/v1/videos:annotate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputUri: videoUrl,
        features: ["SHOT_CHANGE_DETECTION", "LABEL_DETECTION"],
        videoContext: {
          labelDetectionConfig: {
            labelDetectionMode: "SHOT_MODE",
            stationaryCamera: false,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Video Intelligence API error: ${error}`);
  }

  const data = await response.json();
  return data.name;
}

// Poll for operation completion
async function pollOperation(operationName: string, accessToken: string): Promise<any> {
  const maxAttempts = 60;
  const pollInterval = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `https://videointelligence.googleapis.com/v1/${operationName}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to poll operation: ${error}`);
    }

    const data = await response.json();
    
    if (data.done) {
      if (data.error) {
        throw new Error(`Video analysis failed: ${JSON.stringify(data.error)}`);
      }
      return data.response;
    }

    console.log(`Polling attempt ${attempt + 1}/${maxAttempts}...`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error("Video analysis timed out");
}

// Detect goals from annotations
function detectGoalsFromAnnotations(annotations: any, videoDuration: number): GoalDetection[] {
  const goals: GoalDetection[] = [];
  const shotAnnotations = annotations.annotationResults?.[0]?.shotAnnotations || [];
  const labelAnnotations = annotations.annotationResults?.[0]?.shotLabelAnnotations || [];

  console.log(`Found ${shotAnnotations.length} shots and ${labelAnnotations.length} label annotations`);

  const excitementKeywords = ['goal', 'score', 'celebration', 'crowd', 'cheering', 'soccer', 'football', 'net', 'goalkeeper'];
  const significantMoments: { time: number; score: number; description: string }[] = [];

  for (const label of labelAnnotations) {
    const entity = label.entity?.description?.toLowerCase() || '';
    const isRelevant = excitementKeywords.some(kw => entity.includes(kw));
    
    if (isRelevant) {
      for (const segment of label.segments || []) {
        const startTime = parseFloat(segment.segment?.startTimeOffset?.replace('s', '') || '0');
        const confidence = segment.confidence || 0.5;
        
        if (startTime > 0 && startTime < videoDuration) {
          significantMoments.push({
            time: startTime,
            score: confidence * (entity.includes('goal') || entity.includes('score') ? 2 : 1),
            description: `Detected ${entity}`,
          });
        }
      }
    }
  }

  if (significantMoments.length === 0) {
    console.log("No goal-specific labels found, analyzing shot changes...");
    
    for (let i = 1; i < shotAnnotations.length; i++) {
      const currentShot = shotAnnotations[i];
      const currentStart = parseFloat(currentShot.startTimeOffset?.replace('s', '') || '0');
      const shotDuration = parseFloat(currentShot.endTimeOffset?.replace('s', '') || '0') - currentStart;
      
      if (shotDuration < 3 && shotDuration > 0.5) {
        significantMoments.push({
          time: currentStart,
          score: 1 / shotDuration,
          description: "Rapid action sequence detected",
        });
      }
    }
  }

  significantMoments.sort((a, b) => b.score - a.score);
  
  const selectedTimes: number[] = [];
  for (const moment of significantMoments) {
    const isFarEnough = selectedTimes.every(t => Math.abs(t - moment.time) > 30);
    if (isFarEnough && moment.time > 10 && moment.time < videoDuration - 10) {
      selectedTimes.push(moment.time);
      goals.push({
        timestamp_seconds: Math.round(moment.time),
        description: moment.description,
        confidence: moment.score > 1.5 ? "high" : moment.score > 0.8 ? "medium" : "low",
      });
      
      if (goals.length >= 5) break;
    }
  }

  if (goals.length === 0 && videoDuration > 60) {
    console.log("No significant moments found, using fallback distribution");
    const numGoals = Math.min(Math.floor(videoDuration / 90), 4);
    const interval = videoDuration / (numGoals + 1);
    
    for (let i = 1; i <= numGoals; i++) {
      goals.push({
        timestamp_seconds: Math.round(interval * i),
        description: "Potential highlight moment",
        confidence: "low",
      });
    }
  }

  return goals.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
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
    const googleKeyJson = Deno.env.get('GOOGLE_VIDEO_INTELLIGENCE_KEY');
    
    if (!googleKeyJson) {
      throw new Error('GOOGLE_VIDEO_INTELLIGENCE_KEY is not configured');
    }

    const googleKey = JSON.parse(googleKeyJson);
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

    console.log("Getting Google access token...");
    const accessToken = await getGoogleAccessToken(googleKey);

    const inputUri = job.video_url;
    console.log(`Starting Video Intelligence analysis for: ${inputUri}`);
    
    const operationName = await startVideoAnnotation(inputUri, accessToken);
    console.log(`Video Intelligence operation started: ${operationName}`);

    console.log("Waiting for video analysis to complete...");
    const annotations = await pollOperation(operationName, accessToken);
    console.log("Video analysis completed!");

    const goals = detectGoalsFromAnnotations(annotations, videoDuration);
    console.log(`Detected ${goals.length} potential goals:`, goals);

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
        message: `Detected ${goals.length} highlight moments using Google Video Intelligence API`
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
