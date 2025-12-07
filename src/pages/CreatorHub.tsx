import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Video, Sparkles, CheckCircle, XCircle, Film, Send, Layers } from "lucide-react";
import VideoUploadSection from "@/components/creator-hub/VideoUploadSection";
import AnalysisStatusCard from "@/components/creator-hub/AnalysisStatusCard";
import HighlightReviewSection from "@/components/creator-hub/HighlightReviewSection";

interface AnalysisJob {
  id: string;
  video_url: string;
  status: string;
  error_message: string | null;
  match_id: string | null;
  created_at: string;
}

interface HighlightClip {
  id: string;
  goal_timestamp_seconds: number;
  start_time_seconds: number;
  end_time_seconds: number;
  clip_video_url: string | null;
  is_selected: boolean;
  caption: string | null;
}

const CreatorHub = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeJob, setActiveJob] = useState<AnalysisJob | null>(null);
  const [clips, setClips] = useState<HighlightClip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchLatestJob();
    }
  }, [user]);

  // Poll for job updates when analyzing
  useEffect(() => {
    if (activeJob && ['analyzing', 'processing', 'uploading'].includes(activeJob.status)) {
      const interval = setInterval(async () => {
        const { data, error } = await supabase
          .from('video_analysis_jobs')
          .select('*')
          .eq('id', activeJob.id)
          .single();
        
        if (data && !error) {
          setActiveJob(data);
          if (data.status === 'completed') {
            fetchClips(data.id);
            setIsAnalyzing(false);
          } else if (data.status === 'failed') {
            setIsAnalyzing(false);
            toast({
              title: "Analysis Failed",
              description: data.error_message || "An error occurred during analysis",
              variant: "destructive",
            });
          }
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [activeJob]);

  const fetchLatestJob = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_analysis_jobs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setActiveJob(data);
        if (data.status === 'completed') {
          await fetchClips(data.id);
        } else if (['analyzing', 'processing', 'uploading'].includes(data.status)) {
          setIsAnalyzing(true);
        }
      }
    } catch (error) {
      console.error("Error fetching job:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClips = async (jobId: string) => {
    const { data, error } = await supabase
      .from('highlight_clips')
      .select('*')
      .eq('video_analysis_job_id', jobId)
      .order('goal_timestamp_seconds', { ascending: true });

    if (error) {
      console.error("Error fetching clips:", error);
      return;
    }

    setClips(data || []);
  };

  const handleVideoUpload = async (file: File, matchId?: string) => {
    if (!user) return;

    setIsUploading(true);
    try {
      // Upload video to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('match-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('match-videos')
        .getPublicUrl(fileName);

      // Create analysis job
      const { data: job, error: jobError } = await supabase
        .from('video_analysis_jobs')
        .insert({
          user_id: user.id,
          video_url: publicUrl,
          match_id: matchId || null,
          status: 'pending',
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setActiveJob(job);
      setClips([]);
      
      toast({
        title: "Video Uploaded",
        description: "Your video has been uploaded. Click 'Analyze Video' to detect goals.",
      });

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!activeJob) return;

    setIsAnalyzing(true);
    try {
      // Update status to analyzing
      await supabase
        .from('video_analysis_jobs')
        .update({ status: 'uploading' })
        .eq('id', activeJob.id);

      setActiveJob({ ...activeJob, status: 'uploading' });

      // Call the edge function with video duration
      const { error } = await supabase.functions.invoke('analyze-video', {
        body: { 
          jobId: activeJob.id,
          videoDuration: videoDuration || 600 // Pass actual duration or default to 10 min
        },
      });

      if (error) throw error;

    } catch (error) {
      console.error("Analysis error:", error);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to start analysis",
        variant: "destructive",
      });
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      console.log("Video duration:", videoRef.current.duration);
    }
  };

  const handleClipToggle = async (clipId: string, isSelected: boolean) => {
    const { error } = await supabase
      .from('highlight_clips')
      .update({ is_selected: isSelected })
      .eq('id', clipId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update clip selection",
        variant: "destructive",
      });
      return;
    }

    setClips(clips.map(c => c.id === clipId ? { ...c, is_selected: isSelected } : c));
  };

  const handleCaptionChange = async (clipId: string, caption: string) => {
    const { error } = await supabase
      .from('highlight_clips')
      .update({ caption })
      .eq('id', clipId);

    if (!error) {
      setClips(clips.map(c => c.id === clipId ? { ...c, caption } : c));
    }
  };

  const handlePublishIndividual = async () => {
    if (!user || !activeJob) return;

    const selectedClips = clips.filter(c => c.is_selected);
    if (selectedClips.length === 0) {
      toast({
        title: "No Clips Selected",
        description: "Please select at least one highlight to publish",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);
    try {
      const posts = selectedClips.map(clip => ({
        user_id: user.id,
        match_id: activeJob.match_id,
        media_url: activeJob.video_url,
        caption: clip.caption || `Goal highlight at ${formatTimestamp(clip.goal_timestamp_seconds)}`,
        post_type: 'highlight' as const,
        highlight_type: 'goal',
      }));

      const { error } = await supabase
        .from('feed_posts')
        .insert(posts);

      if (error) throw error;

      toast({
        title: "Published!",
        description: `${selectedClips.length} highlight(s) published to your feed`,
      });

      // Reset state for new upload
      setActiveJob(null);
      setClips([]);

    } catch (error) {
      console.error("Publish error:", error);
      toast({
        title: "Publish Failed",
        description: error instanceof Error ? error.message : "Failed to publish highlights",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishReel = async () => {
    if (!user || !activeJob) return;

    const selectedClips = clips.filter(c => c.is_selected);
    if (selectedClips.length === 0) {
      toast({
        title: "No Clips Selected",
        description: "Please select at least one highlight to publish",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);
    try {
      // For now, we'll create a single post with the full video
      // In production, this would concatenate the clips
      const caption = selectedClips.map(c => 
        c.caption || `Goal at ${formatTimestamp(c.goal_timestamp_seconds)}`
      ).join(' | ');

      const { error } = await supabase
        .from('feed_posts')
        .insert({
          user_id: user.id,
          match_id: activeJob.match_id,
          media_url: activeJob.video_url,
          caption: `🎬 Match Highlights: ${caption}`,
          post_type: 'highlight' as const,
          highlight_type: 'match',
        });

      if (error) throw error;

      toast({
        title: "Reel Published!",
        description: "Your highlight reel has been published to your feed",
      });

      // Reset state for new upload
      setActiveJob(null);
      setClips([]);

    } catch (error) {
      console.error("Publish error:", error);
      toast({
        title: "Publish Failed",
        description: error instanceof Error ? error.message : "Failed to publish reel",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleNewAnalysis = () => {
    setActiveJob(null);
    setClips([]);
  };

  const handleCancelAnalysis = async () => {
    if (!activeJob) return;
    
    setIsCancelling(true);
    try {
      // Update job status to failed/cancelled
      await supabase
        .from('video_analysis_jobs')
        .update({ status: 'failed', error_message: 'Cancelled by user' })
        .eq('id', activeJob.id);
      
      setActiveJob(null);
      setClips([]);
      setIsAnalyzing(false);
      
      toast({
        title: "Analysis Cancelled",
        description: "Video analysis has been cancelled",
      });
    } catch (error) {
      console.error("Cancel error:", error);
      toast({
        title: "Error",
        description: "Failed to cancel analysis",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>

      <div className="container max-w-4xl py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Creator Hub
          </h1>
          <p className="text-muted-foreground">
            Upload match videos and auto-generate highlight clips using AI
          </p>
        </div>

        {/* Status Card when job is in progress */}
        {activeJob && ['uploading', 'analyzing', 'processing'].includes(activeJob.status) && (
          <AnalysisStatusCard 
            status={activeJob.status} 
            onCancel={handleCancelAnalysis}
            isCancelling={isCancelling}
          />
        )}

        {/* Failed State */}
        {activeJob && activeJob.status === 'failed' && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <XCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Analysis Failed</p>
                  <p className="text-sm text-muted-foreground">{activeJob.error_message || "An error occurred"}</p>
                </div>
              </div>
              <Button onClick={handleNewAnalysis} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upload Section - show when no active job or job failed */}
        {(!activeJob || activeJob.status === 'failed') && (
          <VideoUploadSection 
            onUpload={handleVideoUpload} 
            isUploading={isUploading} 
          />
        )}

        {/* Pending State - Ready to Analyze */}
        {activeJob && activeJob.status === 'pending' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Video Ready
              </CardTitle>
              <CardDescription>
                Your video has been uploaded. Click below to analyze it for goals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <video 
                ref={videoRef}
                src={activeJob.video_url} 
                controls 
                className="w-full rounded-lg max-h-[300px] bg-black"
                onLoadedMetadata={handleVideoLoaded}
              />
              <div className="flex gap-3">
                <Button 
                  onClick={handleAnalyze} 
                  disabled={isAnalyzing}
                  className="flex-1"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze Video
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleNewAnalysis}>
                  Upload Different Video
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed State - Review Highlights */}
        {activeJob && activeJob.status === 'completed' && (
          <HighlightReviewSection
            clips={clips}
            videoUrl={activeJob.video_url}
            onClipToggle={handleClipToggle}
            onCaptionChange={handleCaptionChange}
            onPublishIndividual={handlePublishIndividual}
            onPublishReel={handlePublishReel}
            onNewAnalysis={handleNewAnalysis}
            isPublishing={isPublishing}
          />
        )}
      </div>
    </Layout>
  );
};

export default CreatorHub;
