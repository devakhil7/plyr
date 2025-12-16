import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, MessageCircle, Instagram, Link } from "lucide-react";
import { toast } from "sonner";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  caption?: string;
  onShare: () => void;
}

export function ShareDialog({ open, onOpenChange, postId, caption, onShare }: ShareDialogProps) {
  const postUrl = `${window.location.origin}/feed?post=${postId}`;
  const shareText = caption || "Check out this highlight on SPORTIQ!";

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(postUrl);
    onShare();
    toast.success("Link copied to clipboard!");
    onOpenChange(false);
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n\n${postUrl}`)}`;
    onShare();
    onOpenChange(false);
    window.location.href = whatsappUrl;
  };

  const handleInstagramShare = async () => {
    // Try native share API first (works on mobile and can trigger Instagram)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SPORTIQ Highlight",
          text: shareText,
          url: postUrl,
        });
        onShare();
        onOpenChange(false);
        return;
      } catch (error) {
        // User cancelled or share failed, fall back to clipboard
        if ((error as Error).name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
    }
    
    // Fallback: Copy link and guide user to Instagram
    await navigator.clipboard.writeText(postUrl);
    
    // Try to open Instagram app with the link
    const instagramUrl = `instagram://share?text=${encodeURIComponent(`${shareText}\n\n${postUrl}`)}`;
    
    // Create a hidden iframe to try opening the app
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = instagramUrl;
    document.body.appendChild(iframe);
    
    // Remove iframe after attempt
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
    
    toast.success("Link copied! Paste in your Instagram story or DM.", {
      action: {
        label: "Open Instagram",
        onClick: () => window.open("https://instagram.com", "_blank"),
      },
    });
    onShare();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Share Highlight</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 py-4">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-green-500/10 hover:border-green-500"
            onClick={handleWhatsAppShare}
          >
            <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-medium">WhatsApp</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-pink-500/10 hover:border-pink-500"
            onClick={handleInstagramShare}
          >
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
              <Instagram className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-medium">Instagram</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/10 hover:border-primary"
            onClick={handleCopyLink}
          >
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
              <Link className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">Copy Link</span>
          </Button>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <input
            type="text"
            value={postUrl}
            readOnly
            className="flex-1 bg-transparent text-sm text-muted-foreground outline-none truncate"
          />
          <Button size="sm" variant="ghost" onClick={handleCopyLink}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}