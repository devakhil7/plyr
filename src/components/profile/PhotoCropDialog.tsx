import { useState, useRef, useCallback } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputSize = 400; // Output image size
    canvas.width = outputSize;
    canvas.height = outputSize;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerSize = containerRect.width;

    // Calculate the visible area of the image
    const img = imageRef.current;
    const imgNaturalWidth = img.naturalWidth;
    const imgNaturalHeight = img.naturalHeight;

    // Calculate the scaled image dimensions as displayed
    const displayedWidth = imgNaturalWidth * scale;
    const displayedHeight = imgNaturalHeight * scale;

    // Calculate source coordinates
    const sourceX = ((containerSize / 2 - position.x) / scale) - (imgNaturalWidth / 2) + (imgNaturalWidth / 2);
    const sourceY = ((containerSize / 2 - position.y) / scale) - (imgNaturalHeight / 2) + (imgNaturalHeight / 2);
    const sourceSize = containerSize / scale;

    // Draw the cropped image
    ctx.drawImage(
      img,
      (imgNaturalWidth / 2) - (sourceSize / 2) - (position.x / scale),
      (imgNaturalHeight / 2) - (sourceSize / 2) - (position.y / scale),
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
        onOpenChange(false);
        // Reset state
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    }, "image/jpeg", 0.9);
  }, [scale, position, onCropComplete, onOpenChange]);

  const handleCancel = () => {
    onOpenChange(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
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
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: "center center",
                left: "50%",
                top: "50%",
                marginLeft: "-50%",
                marginTop: "-50%",
                maxWidth: "none",
                width: "100%",
              }}
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
          <Button onClick={handleCrop}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
