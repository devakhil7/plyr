import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Move } from "lucide-react";

interface PhotoCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onCropComplete: (croppedBlob: Blob) => void;
}

export function PhotoCropDialog({
  open,
  onOpenChange,
  imageUrl,
  onCropComplete,
}: PhotoCropDialogProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const CONTAINER_SIZE = 256; // 64 * 4 = 256px (w-64)

  // Reset state when dialog opens with new image
  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
    }
  }, [open, imageUrl]);

  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
      setImageLoaded(true);
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleCrop = useCallback(() => {
    if (!imageRef.current || !containerRef.current || !imageLoaded) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputSize = 400;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const img = imageRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // Calculate displayed image size (image is set to width: 100% of container)
    const displayedWidth = CONTAINER_SIZE;
    const displayedHeight = (naturalHeight / naturalWidth) * CONTAINER_SIZE;

    // Scale factor from displayed to natural
    const displayToNaturalRatio = naturalWidth / displayedWidth;

    // The image is centered at 50%/50%, then offset by position and scaled
    // Calculate what portion of the natural image is visible in the container

    // Center of container in image coordinates (before position offset)
    const centerX = naturalWidth / 2;
    const centerY = naturalHeight / 2;

    // The visible area size in natural coordinates
    const visibleSize = CONTAINER_SIZE / scale * displayToNaturalRatio;

    // Position offset converted to natural coordinates
    const offsetX = position.x * displayToNaturalRatio / scale;
    const offsetY = position.y * displayToNaturalRatio / scale;

    // Source rectangle
    const sourceX = centerX - visibleSize / 2 - offsetX;
    const sourceY = centerY - visibleSize / 2 - offsetY;

    // Draw with white background for any areas outside the image
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputSize, outputSize);

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      visibleSize,
      visibleSize,
      0,
      0,
      outputSize,
      outputSize
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
        onOpenChange(false);
      }
    }, "image/jpeg", 0.9);
  }, [scale, position, onCropComplete, onOpenChange, imageLoaded]);

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Calculate image style for preview
  const getImageStyle = () => {
    if (!imageLoaded) return {};
    
    const aspectRatio = imageDimensions.height / imageDimensions.width;
    const displayedHeight = CONTAINER_SIZE * aspectRatio;
    
    return {
      width: CONTAINER_SIZE,
      height: displayedHeight,
      transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
      transformOrigin: "center center",
      left: "50%",
      top: "50%",
      maxWidth: "none",
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Move className="h-4 w-4" />
            Drag to reposition, use slider to zoom
          </p>

          {/* Crop area */}
          <div
            ref={containerRef}
            className="relative w-64 h-64 mx-auto overflow-hidden rounded-full border-2 border-primary bg-muted cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop preview"
              className="absolute select-none pointer-events-none"
              style={getImageStyle()}
              onLoad={handleImageLoad}
              draggable={false}
            />
          </div>

          {/* Zoom control */}
          <div className="flex items-center gap-3 px-4">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[scale]}
              onValueChange={([value]) => setScale(value)}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={!imageLoaded}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
