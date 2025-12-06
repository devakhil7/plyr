import React, { useState } from 'react';
import { format } from 'date-fns';
import { CreditCard, Loader2, MapPin, Clock, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CalendarSlotPicker } from '@/components/CalendarSlotPicker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TurfBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turf: {
    id: string;
    name: string;
    location: string;
    price_per_hour: number | null;
  } | null;
  onBookingComplete?: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const TurfBookingDialog: React.FC<TurfBookingDialogProps> = ({
  open,
  onOpenChange,
  turf,
  onBookingComplete,
}) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);
  const [isProcessing, setIsProcessing] = useState(false);

  const pricePerHour = turf?.price_per_hour || 0;
  const totalAmount = (pricePerHour * duration) / 60;

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleBooking = async () => {
    if (!user || !turf || !selectedTime) {
      toast.error('Please select a time slot');
      return;
    }

    setIsProcessing(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      const endMinutes = timeToMinutes(selectedTime) + duration;
      const endTime = minutesToTime(endMinutes);

      // Create order
      const { data: session } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          turf_id: turf.id,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: selectedTime,
          end_time: endTime,
          duration_minutes: duration,
          amount: totalAmount,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create order');
      }

      const orderData = response.data;

      // Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'SPORTIQ',
        description: `Turf Booking - ${turf.name}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_id: orderData.booking_id,
              },
            });

            if (verifyResponse.error) {
              throw new Error('Payment verification failed');
            }

            toast.success('Booking confirmed! Your slot has been reserved.');
            onOpenChange(false);
            onBookingComplete?.();
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#0A3D91',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to process booking');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!turf) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Book {turf.name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {turf.location}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <CalendarSlotPicker
            turfId={turf.id}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            duration={duration}
            onDateChange={setSelectedDate}
            onTimeChange={setSelectedTime}
            onDurationChange={setDuration}
          />

          {/* Pricing summary */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  ₹{pricePerHour}/hour × {duration / 60} hours
                </span>
              </div>
              <div className="text-2xl font-bold text-primary">
                ₹{totalAmount.toLocaleString('en-IN')}
              </div>
            </div>

            <Button
              onClick={handleBooking}
              disabled={!selectedTime || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pay ₹{totalAmount.toLocaleString('en-IN')} & Book
                </>
              )}
            </Button>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
