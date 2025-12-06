import { useState, useMemo } from "react";
import { format, addDays, startOfToday, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TimeSlotPickerProps {
  turfId: string;
  selectedDate: string;
  selectedTime: string;
  duration: number;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onDurationChange: (duration: number) => void;
}

interface BookedSlot {
  match_time: string;
  duration_minutes: number;
  match_date: string;
}

const SLOT_START_HOUR = 6; // 6 AM
const SLOT_END_HOUR = 23; // 11 PM
const SLOT_INTERVAL = 30; // 30 minute intervals

const durationOptions = [
  { value: 60, label: "60 min (1 hr)" },
  { value: 90, label: "90 min (1.5 hrs)" },
  { value: 120, label: "120 min (2 hrs)" },
  { value: 150, label: "150 min (2.5 hrs)" },
  { value: 180, label: "180 min (3 hrs)" },
];

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
      slots.push(minutesToTime(hour * 60 + minute));
    }
  }
  return slots;
}

export function TimeSlotPicker({
  turfId,
  selectedDate,
  selectedTime,
  duration,
  onDateChange,
  onTimeChange,
  onDurationChange,
}: TimeSlotPickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const allTimeSlots = useMemo(() => generateTimeSlots(), []);

  // Fetch booked slots for the selected turf and date
  const { data: bookedSlots = [] } = useQuery({
    queryKey: ["booked-slots", turfId, selectedDate],
    queryFn: async () => {
      if (!turfId || !selectedDate) return [];
      
      const { data, error } = await supabase
        .from("matches")
        .select("match_time, duration_minutes, match_date")
        .eq("turf_id", turfId)
        .eq("match_date", selectedDate)
        .neq("status", "cancelled");
      
      if (error) throw error;
      return (data || []) as BookedSlot[];
    },
    enabled: !!turfId && !!selectedDate,
  });

  // Calculate which slots are blocked
  const blockedSlots = useMemo(() => {
    const blocked = new Set<string>();
    
    bookedSlots.forEach((booking) => {
      const startMinutes = timeToMinutes(booking.match_time);
      const endMinutes = startMinutes + (booking.duration_minutes || 60);
      
      // Block all slots that fall within this booking
      for (let min = startMinutes; min < endMinutes; min += SLOT_INTERVAL) {
        blocked.add(minutesToTime(min));
      }
    });
    
    return blocked;
  }, [bookedSlots]);

  // Check if a slot + duration would conflict with any booking
  const isSlotAvailable = (slotTime: string, durationMins: number): boolean => {
    const slotStart = timeToMinutes(slotTime);
    const slotEnd = slotStart + durationMins;
    
    // Check if slot ends after operating hours
    if (slotEnd > SLOT_END_HOUR * 60) return false;
    
    // Check each interval within the proposed booking
    for (let min = slotStart; min < slotEnd; min += SLOT_INTERVAL) {
      if (blockedSlots.has(minutesToTime(min))) {
        return false;
      }
    }
    
    return true;
  };

  // Group slots by availability
  const slotStatuses = useMemo(() => {
    return allTimeSlots.map((slot) => ({
      time: slot,
      available: isSlotAvailable(slot, duration),
      isBooked: blockedSlots.has(slot),
    }));
  }, [allTimeSlots, duration, blockedSlots]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(format(date, "yyyy-MM-dd"));
      onTimeChange(""); // Reset time when date changes
    }
    setCalendarOpen(false);
  };

  const handleSlotClick = (slot: string, available: boolean) => {
    if (available) {
      onTimeChange(slot);
    }
  };

  const selectedDateObj = selectedDate ? parseISO(selectedDate) : undefined;

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div className="space-y-2">
        <Label>Select Date *</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(parseISO(selectedDate), "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDateObj}
              onSelect={handleDateSelect}
              disabled={(date) => date < startOfToday()}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Duration Selection */}
      <div className="space-y-2">
        <Label>Duration *</Label>
        <Select
          value={String(duration)}
          onValueChange={(value) => {
            onDurationChange(Number(value));
            // Revalidate selected time with new duration
            if (selectedTime && !isSlotAvailable(selectedTime, Number(value))) {
              onTimeChange("");
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {durationOptions.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Minimum 60 minutes, add 30 min increments</p>
      </div>

      {/* Time Slot Grid */}
      {selectedDate && turfId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Select Time Slot *
            </Label>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary/20 border border-primary"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive"></div>
                <span>Booked</span>
              </div>
            </div>
          </div>

          {!turfId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              <AlertCircle className="h-4 w-4" />
              Select a turf to see available slots
            </div>
          )}

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[300px] overflow-y-auto p-1">
            {slotStatuses.map(({ time, available, isBooked }) => (
              <Button
                key={time}
                type="button"
                size="sm"
                variant={selectedTime === time ? "default" : "outline"}
                className={cn(
                  "text-xs h-10 transition-all",
                  selectedTime === time && "ring-2 ring-primary ring-offset-2",
                  !available && "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 cursor-not-allowed",
                  available && selectedTime !== time && "bg-primary/5 border-primary/30 hover:bg-primary/10 hover:border-primary"
                )}
                onClick={() => handleSlotClick(time, available)}
                disabled={!available}
              >
                {formatTimeDisplay(time)}
              </Button>
            ))}
          </div>

          {selectedTime && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium">
                Selected: {formatTimeDisplay(selectedTime)} - {formatTimeDisplay(minutesToTime(timeToMinutes(selectedTime) + duration))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {duration} minutes on {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          )}
        </div>
      )}

      {selectedDate && !turfId && (
        <div className="flex items-center gap-2 text-sm text-amber-600 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4" />
          Please select a turf first to view available time slots
        </div>
      )}
    </div>
  );
}
