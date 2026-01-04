import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Share2, Copy, Check, MessageCircle, Twitter, Send, Share, Trophy, QrCode, Download } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

interface TournamentShareDialogProps {
  tournamentId: string;
  tournamentName: string;
  startDate: string;
  endDate: string;
  city: string;
  entryFee?: number;
  prizeDetails?: string;
}

export function TournamentShareDialog({
  tournamentId,
  tournamentName,
  startDate,
  endDate,
  city,
  entryFee,
  prizeDetails
}: TournamentShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const tournamentUrl = `${window.location.origin}/tournaments/${tournamentId}`;
  const dateRange = `${format(new Date(startDate), "MMM d")} - ${format(new Date(endDate), "MMM d, yyyy")}`;
  
  const shareText = `🏆 Register your team for ${tournamentName}!\n📅 ${dateRange}\n📍 ${city}${entryFee && entryFee > 0 ? `\n💰 Entry: ₹${entryFee.toLocaleString()}` : ''}${prizeDetails ? `\n🎖️ ${prizeDetails}` : ''}\n\nRegister here: ${tournamentUrl}`;
  const shortShareText = `Register for "${tournamentName}" - ${dateRange} in ${city}${prizeDetails ? ` | ${prizeDetails}` : ''}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tournamentUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.location.href = whatsappUrl;
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortShareText)}&url=${encodeURIComponent(tournamentUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(tournamentUrl)}&text=${encodeURIComponent(shortShareText)}`;
    window.open(telegramUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tournamentName,
          text: shortShareText,
          url: tournamentUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      handleCopy();
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size with padding
      const padding = 40;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2 + 60; // Extra space for text
      
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code
      ctx.drawImage(img, padding, padding);
      
      // Add tournament name
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tournamentName.slice(0, 30), canvas.width / 2, canvas.height - 35);
      
      // Add scan text
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText('Scan to register', canvas.width / 2, canvas.height - 15);
      
      // Download
      const link = document.createElement('a');
      link.download = `${tournamentName.replace(/\s+/g, '-')}-QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('QR code downloaded!');
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-white border-white/50 hover:bg-white/10 hover:text-white">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Tournament</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{tournamentName}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {dateRange} • {city}
              </p>
              {entryFee && entryFee > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Entry Fee: ₹{entryFee.toLocaleString()}
                </p>
              )}
              {prizeDetails && (
                <p className="text-xs text-green-600 font-medium mt-1">
                  🏆 {prizeDetails}
                </p>
              )}
            </div>

            {/* Copy Link */}
            <div className="flex gap-2">
              <Input value={tournamentUrl} readOnly className="flex-1 text-sm bg-background" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            {/* Share Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleWhatsAppShare} className="bg-green-600 hover:bg-green-700">
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button onClick={handleTelegramShare} className="bg-blue-500 hover:bg-blue-600">
                <Send className="h-4 w-4 mr-2" />
                Telegram
              </Button>
              <Button onClick={handleTwitterShare} variant="outline">
                <Twitter className="h-4 w-4 mr-2" />
                Twitter
              </Button>
              <Button onClick={handleNativeShare} variant="outline">
                <Share className="h-4 w-4 mr-2" />
                More
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg" ref={qrRef}>
              <QRCodeSVG
                value={tournamentUrl}
                size={200}
                level="H"
                includeMargin
                imageSettings={{
                  src: "/favicon.ico",
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>
            
            <div className="text-center space-y-1">
              <p className="font-medium text-sm">{tournamentName}</p>
              <p className="text-xs text-muted-foreground">
                Scan to register for the tournament
              </p>
            </div>

            <Button onClick={handleDownloadQR} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Print this QR code on posters or share it digitally
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
