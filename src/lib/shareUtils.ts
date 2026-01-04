import { toast } from "sonner";

export interface ShareOptions {
  title: string;
  text: string;
  url: string;
  videoUrl?: string | null;
}

/**
 * Opens WhatsApp with pre-filled message - uses deep link for mobile app
 */
export const shareToWhatsApp = ({ text, url }: ShareOptions) => {
  const message = `${text}\n\n${url}`;
  // whatsapp:// deep link opens the mobile app directly
  const mobileUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
  const webUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  
  // Try mobile deep link first, fall back to web
  tryDeepLink(mobileUrl, webUrl);
};

/**
 * Opens Instagram - copies link and tries to open Instagram app
 */
export const shareToInstagram = async ({ text, url }: ShareOptions) => {
  const message = `${text}\n\n${url}`;
  
  // Copy to clipboard first
  await navigator.clipboard.writeText(message);
  
  // Instagram doesn't have a direct share URL scheme for text
  // We try to open the app and guide user
  const instagramAppUrl = 'instagram://app';
  
  // Create a hidden link to try opening the app
  const link = document.createElement('a');
  link.href = instagramAppUrl;
  link.style.display = 'none';
  document.body.appendChild(link);
  
  // Try to open Instagram app
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
  }, 100);
  
  toast.success("Link copied! Paste it in your Instagram story or DM", {
    duration: 4000,
  });
};

/**
 * Opens YouTube - for sharing videos/highlights
 */
export const shareToYouTube = async ({ text, url, videoUrl }: ShareOptions) => {
  const message = `${text}\n\n${url}`;
  
  // Copy the message first
  await navigator.clipboard.writeText(message);
  
  // YouTube app URL scheme
  const youtubeAppUrl = 'youtube://';
  
  // Try to open YouTube app for sharing
  const link = document.createElement('a');
  link.href = youtubeAppUrl;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
  }, 100);
  
  toast.success("Link copied! Share as a YouTube Short or in comments", {
    duration: 4000,
  });
};

/**
 * Copy link to clipboard
 */
export const copyLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  } catch (error) {
    toast.error("Failed to copy link");
  }
};

/**
 * Native share (Web Share API) - works on mobile for sharing to any app
 */
export const nativeShare = async ({ title, text, url }: ShareOptions): Promise<boolean> => {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (error) {
      // User cancelled or share failed
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
      }
      return false;
    }
  }
  return false;
};

/**
 * Share with file (image/video) using Web Share API
 */
export const shareWithFile = async ({ title, text, url }: ShareOptions, file: File): Promise<boolean> => {
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text: `${text}\n\n${url}`,
        files: [file],
      });
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
      }
      return false;
    }
  }
  return false;
};

/**
 * Try deep link first, fall back to web URL
 */
const tryDeepLink = (deepLink: string, fallbackUrl: string) => {
  // Create an invisible iframe to try the deep link
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = deepLink;
  document.body.appendChild(iframe);
  
  // Also try window.location for better mobile support
  const startTime = Date.now();
  window.location.href = deepLink;
  
  // If the app doesn't open within 1.5 seconds, open the web version
  setTimeout(() => {
    if (Date.now() - startTime < 2000) {
      window.open(fallbackUrl, '_blank');
    }
    document.body.removeChild(iframe);
  }, 1500);
};

/**
 * Share to Twitter/X
 */
export const shareToTwitter = ({ text, url }: ShareOptions) => {
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  window.open(twitterUrl, '_blank');
};

/**
 * Share to Telegram
 */
export const shareToTelegram = ({ text, url }: ShareOptions) => {
  // Telegram deep link for mobile app
  const mobileUrl = `tg://msg_url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const webUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  
  tryDeepLink(mobileUrl, webUrl);
};
