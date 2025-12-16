import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Video, Clock, CheckCircle, XCircle, Play, Eye, Film, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { AdminVideoTagger } from "@/components/match/AdminVideoTagger";
import { VideoHighlightEvents } from "@/components/match/VideoHighlightEvents";

const GetAnalytics = () => {
  const { user } = useAuth();
  const { isAdmin, isTurfOwner } = useUserRoles();
  const queryClient = useQueryClient();
  const canManage = isAdmin || isTurfOwner;

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [viewingJob, setViewingJob] = useState<any>(null);

  // Fetch user's submissions
  const { data: mySubmissions, isLoading: loadingMine } = useQuery({
    queryKey: ["my-video-submissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("video_analysis_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch all submissions for admin
  const { data: allSubmissions, isLoading: loadingAll } = useQuery({
    queryKey: ["all-video-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_analysis_jobs")
        .select(`
          *,
          profiles:user_id (name, profile_photo_url)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: canManage,
  });

  // Fetch events for viewing
  const { data: jobEvents } = useQuery({
    queryKey: ["job-events", viewingJob?.id],
    queryFn: async () => {
      if (!viewingJob?.id) return [];
      const { data, error } = await supabase
        .from("match_video_events")
        .select("*")
        .eq("video_analysis_job_id", viewingJob.id)
        .order("timestamp_seconds", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!viewingJob?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!videoFile || !user?.id) throw new Error("Missing video or user");

      setUploadingVideo(true);

      // Upload video to storage
      const fileExt = videoFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("match-videos")
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("match-videos")
        .getPublicUrl(fileName);

      // Create analysis job
      const { error: insertError } = await supabase
        .from("video_analysis_jobs")
        .insert({
          user_id: user.id,
          video_url: urlData.publicUrl,
          title: title || "Untitled Video",
          status: "pending",
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success("Video submitted for analysis!");
      setTitle("");
      setNotes("");
      setVideoFile(null);
      queryClient.invalidateQueries({ queryKey: ["my-video-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["all-video-submissions"] });
    },
    onError: (error) => {
      toast.error("Failed to submit video: " + error.message);
    },
    onSettled: () => {
      setUploadingVideo(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ jobId, status, adminNotes }: { jobId: string; status: string; adminNotes?: string }) => {
      const updateData: any = { status };
      if (adminNotes !== undefined) updateData.admin_notes = adminNotes;
      
      const { error } = await supabase
        .from("video_analysis_jobs")
        .update(updateData)
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated!");
      queryClient.invalidateQueries({ queryKey: ["my-video-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["all-video-submissions"] });
      setSelectedJob(null);
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "processing":
        return <Badge className="gap-1 bg-primary"><Loader2 className="h-3 w-3 animate-spin" /> In Progress</Badge>;
      case "completed":
        return <Badge className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Completed</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const SubmissionCard = ({ job, showUser = false }: { job: any; showUser?: boolean }) => (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium truncate">{job.title || "Untitled Video"}</h4>
            </div>
            {showUser && job.profiles && (
              <p className="text-sm text-muted-foreground mb-1">
                By: {job.profiles.name || "Unknown User"}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Submitted: {format(new Date(job.created_at), "PPp")}
            </p>
            {job.admin_notes && (
              <p className="text-sm mt-2 p-2 rounded bg-muted/50">
                <span className="font-medium">Admin Notes:</span> {job.admin_notes}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(job.status)}
            <div className="flex gap-1">
              {job.video_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(job.video_url, "_blank")}
                >
                  <Play className="h-3 w-3" />
                </Button>
              )}
              {(job.status === "completed" || canManage) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingJob(job)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
              )}
              {canManage && job.status !== "completed" && (
                <Button
                  size="sm"
                  onClick={() => setSelectedJob(job)}
                >
                  <Film className="h-3 w-3 mr-1" /> Tag
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="container max-w-6xl py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Get Analytics & Highlights</h1>
          <p className="text-muted-foreground">
            Upload your game footage and get professional analysis with highlight reels
          </p>
        </div>

        <Tabs defaultValue={canManage ? "manage" : "submit"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="submit">Submit Video</TabsTrigger>
            {canManage ? (
              <TabsTrigger value="manage">Manage Submissions</TabsTrigger>
            ) : (
              <TabsTrigger value="my-submissions">My Submissions</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="submit" className="space-y-6 mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Game Footage
                </CardTitle>
                <CardDescription>
                  Submit your match video for manual analysis by our team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Video Title</label>
                  <Input
                    placeholder="e.g., Sunday League Match vs FC Thunder"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Video File</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    {videoFile ? (
                      <div className="space-y-2">
                        <Video className="h-8 w-8 mx-auto text-primary" />
                        <p className="font-medium">{videoFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVideoFile(null)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Drag and drop or click to select
                        </p>
                        <Input
                          type="file"
                          accept="video/*"
                          className="max-w-xs mx-auto"
                          onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Additional Notes (Optional)</label>
                  <Textarea
                    placeholder="Any specific moments you want highlighted? Player names, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  disabled={!videoFile || !user || uploadingVideo}
                  onClick={() => uploadMutation.mutate()}
                >
                  {uploadingVideo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Submit for Analysis
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* My Submissions in Submit Tab */}
            {!canManage && mySubmissions && mySubmissions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Your Submissions</h3>
                <div className="space-y-3">
                  {mySubmissions.map((job) => (
                    <SubmissionCard key={job.id} job={job} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-submissions" className="space-y-4 mt-6">
            {loadingMine ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              </div>
            ) : mySubmissions && mySubmissions.length > 0 ? (
              <div className="space-y-3">
                {mySubmissions.map((job) => (
                  <SubmissionCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No submissions yet</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your first video to get started
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {canManage && (
            <TabsContent value="manage" className="space-y-4 mt-6">
              {loadingAll ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </div>
              ) : allSubmissions && allSubmissions.length > 0 ? (
                <div className="space-y-3">
                  {allSubmissions.map((job) => (
                    <SubmissionCard key={job.id} job={job} showUser />
                  ))}
                </div>
              ) : (
                <Card className="glass-card">
                  <CardContent className="py-12 text-center">
                    <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No submissions to review</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Admin Tagging Dialog */}
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tag Video Events - {selectedJob?.title}</DialogTitle>
            </DialogHeader>
            {selectedJob && (
              <div className="space-y-4">
                <AdminVideoTagger
                  videoUrl={selectedJob.video_url}
                  videoAnalysisJobId={selectedJob.id}
                  matchPlayers={[]}
                  onEventAdded={() => {
                    queryClient.invalidateQueries({ queryKey: ["job-events", selectedJob.id] });
                  }}
                />
                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Textarea
                    placeholder="Add notes for the user..."
                    className="flex-1"
                    id="admin-notes"
                  />
                  <Button
                    onClick={() => {
                      const notes = (document.getElementById("admin-notes") as HTMLTextAreaElement)?.value;
                      updateStatusMutation.mutate({
                        jobId: selectedJob.id,
                        status: "completed",
                        adminNotes: notes,
                      });
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete & Share
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View Results Dialog */}
        <Dialog open={!!viewingJob} onOpenChange={() => setViewingJob(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Analysis Results - {viewingJob?.title}</DialogTitle>
            </DialogHeader>
            {viewingJob && (
              <div className="space-y-4">
                {viewingJob.video_url && (
                  <video
                    src={viewingJob.video_url}
                    controls
                    className="w-full rounded-lg max-h-[300px]"
                  />
                )}
                {viewingJob.admin_notes && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium mb-1">Admin Notes</p>
                      <p className="text-muted-foreground">{viewingJob.admin_notes}</p>
                    </CardContent>
                  </Card>
                )}
                <VideoHighlightEvents
                  events={jobEvents || []}
                  videoUrl={viewingJob.video_url}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default GetAnalytics;
