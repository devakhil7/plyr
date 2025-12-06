import React, { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CalendarSlotPickerProps {
  turfId: string | null;
  selectedDate: Date;
  selectedTime: string;
  duration: number;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
  onDurationChange: (duration: number) => void;
}

interface BookedSlot {
  start_time: string;
  end_time: string;
  payment_status: string;
}

// Time slots from 6 AM to 11 PM
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const DURATION_OPTIONS = [60, 90, 120, 150, 180];

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const formatHour = (hour: number): string => {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
};

export const CalendarSlotPicker: React.FC<CalendarSlotPickerProps> = ({
  turfId,
  selectedDate,
  selectedTime,
  duration,
  onDateChange,
  onTimeChange,
  onDurationChange,
}) => {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Fetch bookings for the selected turf and week
  const { data: bookings = [] } = useQuery({
    queryKey: ['turf-bookings', turfId, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!turfId) return [];
      
      const weekEnd = addDays(weekStart, 6);
      const { data, error } = await supabase
        .from('turf_bookings')
        .select('booking_date, start_time, end_time, payment_status')
        .eq('turf_id', turfId)
        .eq('payment_status', 'completed')
        .gte('booking_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('booking_date', format(weekEnd, 'yyyy-MM-dd'));
      
      if (error) {
        console.error('Error fetching bookings:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!turfId,
  });

  // Only block slots based on COMPLETED turf bookings
  // Matches without turf payment should NOT block slots
  const isSlotBooked = (date: Date, hour: number): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slotStart = hour * 60;
    const slotEnd = slotStart + 30; // 30-minute slot granularity

    // Check only completed turf bookings
    const hasBooking = bookings.some((booking: any) => {
      if (booking.booking_date !== dateStr) return false;
      const bookingStart = timeToMinutes(booking.start_time);
      const bookingEnd = timeToMinutes(booking.end_time);
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });

    return hasBooking;
  };

  const isSlotAvailable = (date: Date, hour: number, halfHour: boolean): boolean => {
    const now = new Date();
    const slotDate = new Date(date);
    slotDate.setHours(hour, halfHour ? 30 : 0, 0, 0);
    
    // Can't book in the past
    if (isBefore(slotDate, now)) return false;
    
    // Check if any part of the duration is booked
    const startMinutes = hour * 60 + (halfHour ? 30 : 0);
    for (let m = startMinutes; m < startMinutes + duration; m += 30) {
      const checkHour = m / 60;
      if (isSlotBooked(date, checkHour)) return false;
    }
    
    return true;
  };

  const isSlotSelected = (date: Date, hour: number, halfHour: boolean): boolean => {
    if (!selectedTime || !isSameDay(date, selectedDate)) return false;
    
    const slotMinutes = hour * 60 + (halfHour ? 30 : 0);
    const selectedMinutes = timeToMinutes(selectedTime);
    const selectedEnd = selectedMinutes + duration;
    
    return slotMinutes >= selectedMinutes && slotMinutes < selectedEnd;
  };

  const handleSlotClick = (date: Date, hour: number, halfHour: boolean) => {
    if (!isSlotAvailable(date, hour, halfHour)) return;
    
    onDateChange(date);
    const minutes = hour * 60 + (halfHour ? 30 : 0);
    onTimeChange(minutesToTime(minutes));
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  if (!turfId) {
    return (
      <Card className="p-6 bg-muted/50">
        <p className="text-center text-muted-foreground">
          Please select a turf to view available time slots
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Duration selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Duration:</span>
        {DURATION_OPTIONS.map((d) => (
          <Button
            key={d}
            type="button"
            variant={duration === d ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDurationChange(d)}
            className="min-w-[70px]"
          >
            {d} min
          </Button>
        ))}
      </div>

      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => navigateWeek('prev')}
          disabled={isBefore(weekStart, new Date())}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => navigateWeek('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto touch-pan-x">
          <div className="min-w-[600px]">
            {/* Day headers */}
            <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b bg-muted/50 sticky top-0 z-10">
              <div className="p-2 text-center text-xs font-medium text-muted-foreground">Time</div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "p-2 text-center border-l",
                    isToday(day) && "bg-primary/10",
                    isSameDay(day, selectedDate) && "bg-primary/20"
                  )}
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-sm font-semibold",
                    isToday(day) && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>

            {/* Time slots - reduced height for better mobile scrolling */}
            <div className="max-h-[280px] md:max-h-[350px] overflow-y-auto overscroll-contain">
              {HOURS.map((hour) => (
                <React.Fragment key={hour}>
                  {/* Full hour row */}
                  <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b">
                    <div className="p-1 text-xs text-muted-foreground text-right pr-2 border-r">
                      {formatHour(hour)}
                    </div>
                    {weekDays.map((day) => {
                      const available = isSlotAvailable(day, hour, false);
                      const selected = isSlotSelected(day, hour, false);
                      const booked = isSlotBooked(day, hour);
                      
                      return (
                        <button
                          key={`${day.toISOString()}-${hour}-0`}
                          type="button"
                          disabled={!available}
                          onClick={() => handleSlotClick(day, hour, false)}
                          className={cn(
                            "h-6 border-l border-b-0 transition-colors",
                            available && !selected && "hover:bg-primary/20 cursor-pointer",
                            selected && "bg-primary text-primary-foreground",
                            booked && "bg-destructive/20 cursor-not-allowed",
                            !available && !booked && "bg-muted/50 cursor-not-allowed"
                          )}
                        />
                      );
                    })}
                  </div>
                  {/* Half hour row */}
                  <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-dashed">
                    <div className="p-1 text-xs text-muted-foreground text-right pr-2 border-r" />
                    {weekDays.map((day) => {
                      const available = isSlotAvailable(day, hour, true);
                      const selected = isSlotSelected(day, hour, true);
                      const booked = isSlotBooked(day, hour + 0.5);
                      
                      return (
                        <button
                          key={`${day.toISOString()}-${hour}-30`}
                          type="button"
                          disabled={!available}
                          onClick={() => handleSlotClick(day, hour, true)}
                          className={cn(
                            "h-6 border-l transition-colors",
                            available && !selected && "hover:bg-primary/20 cursor-pointer",
                            selected && "bg-primary text-primary-foreground",
                            booked && "bg-destructive/20 cursor-not-allowed",
                            !available && !booked && "bg-muted/50 cursor-not-allowed"
                          )}
                        />
                      );
                    })}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-primary rounded" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-destructive/20 rounded border" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-muted/50 rounded border" />
          <span>Unavailable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-background rounded border hover:bg-primary/20" />
          <span>Available</span>
        </div>
      </div>

      {/* Selected slot info */}
      {selectedTime && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedTime} - {minutesToTime(timeToMinutes(selectedTime) + duration)} ({duration} minutes)
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
