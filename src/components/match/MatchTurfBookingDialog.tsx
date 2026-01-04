import React, { useState } from 'react';
import { format } from 'date-fns';
import { CreditCard, Loader2, MapPin, Clock, Calendar, Wallet, Banknote, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface MatchTurfBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    id: string;
    match_date: string;
    match_time: string;
    duration_minutes: number;
    turf_id: string;
    turfs: {
      id: string;
      name: string;
      location: string;
      price_per_hour: number | null;
    };
  } | null;
  onBookingComplete?: () => void;
}

type PaymentOption = 'full' | 'advance' | 'ground';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
};

const formatTimeDisplay = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

export const MatchTurfBookingDialog: React.FC<MatchTurfBookingDialogProps> = ({
  open,
  onOpenChange,
  match,
  onBookingComplete,
}) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('full');

  // Fetch turf payment settings
  const { data: turfSettings } = useQuery({
    queryKey: ['turf-payment-settings', match?.turf_id],
    queryFn: async () => {
      if (!match?.turf_id) return null;
      const { data } = await supabase
        .from('turfs')
        .select('allow_advance_payment, advance_amount_type, advance_amount_value, allow_pay_at_ground')
        .eq('id', match.turf_id)
        .single();
      return data;
    },
    enabled: !!match?.turf_id,
  });

  if (!match || !match.turfs) return null;

  const pricePerHour = match.turfs.price_per_hour || 0;
  const totalAmount = (pricePerHour * match.duration_minutes) / 60;

  // Calculate advance amount
  const advanceAmount = turfSettings?.advance_amount_type === 'percentage'
    ? Math.round((totalAmount * (turfSettings?.advance_amount_value || 50)) / 100)
    : (turfSettings?.advance_amount_value || 0);
  
  const remainingAmount = totalAmount - advanceAmount;

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

  const handlePayAtGround = async () => {
    if (!user || !match) return;

    setIsProcessing(true);

    try {
      const endTime = calculateEndTime(match.match_time, match.duration_minutes);

      // Create booking directly with pay_at_ground status
      const { data: booking, error } = await supabase
        .from('turf_bookings')
        .insert({
          turf_id: match.turf_id,
          user_id: user.id,
          match_id: match.id,
          booking_date: match.match_date,
          start_time: match.match_time,
          end_time: endTime,
          duration_minutes: match.duration_minutes,
          amount_paid: 0,
          payment_status: 'pay_at_ground',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Booking confirmed! Please pay at the ground.');
      onOpenChange(false);
      onBookingComplete?.();
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOnlinePayment = async (amount: number, isAdvance: boolean) => {
    if (!user || !match) return;

    setIsProcessing(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      const endTime = calculateEndTime(match.match_time, match.duration_minutes);

      // Create order
      const response = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          turf_id: match.turf_id,
          booking_date: match.match_date,
          start_time: match.match_time,
          end_time: endTime,
          duration_minutes: match.duration_minutes,
          amount: amount,
          total_amount: totalAmount,
          is_advance: isAdvance,
          match_id: match.id,
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
        description: isAdvance 
          ? `Advance Payment - ${match.turfs.name} (₹${remainingAmount} to be paid at ground)`
          : `Turf Booking - ${match.turfs.name}`,
        order_id: orderData.order_id,
        handler: async (razorpayResponse: any) => {
          try {
            const verifyResponse = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
                booking_id: orderData.booking_id,
                is_advance: isAdvance,
              },
            });

            if (verifyResponse.error) {
              throw new Error('Payment verification failed');
            }

            const successMessage = isAdvance
              ? `Advance of ₹${amount} paid! Remaining ₹${remainingAmount} to be paid at ground.`
              : 'Booking confirmed! Your slot has been reserved.';
            
            toast.success(successMessage);
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

  const handleConfirmPayment = () => {
    if (paymentOption === 'ground') {
      handlePayAtGround();
    } else if (paymentOption === 'advance') {
      handleOnlinePayment(advanceAmount, true);
    } else {
      handleOnlinePayment(totalAmount, false);
    }
  };

  const paymentOptions = [
    {
      id: 'full' as PaymentOption,
      title: 'Pay Full Amount',
      description: 'Pay the complete amount now',
      amount: totalAmount,
      icon: CreditCard,
      enabled: true,
    },
    {
      id: 'advance' as PaymentOption,
      title: 'Pay Advance',
      description: `Pay ₹${advanceAmount} now, ₹${remainingAmount} at ground`,
      amount: advanceAmount,
      icon: Wallet,
      enabled: turfSettings?.allow_advance_payment !== false,
    },
    {
      id: 'ground' as PaymentOption,
      title: 'Pay at Ground',
      description: 'No online payment, pay full amount at venue',
      amount: 0,
      icon: Banknote,
      enabled: turfSettings?.allow_pay_at_ground === true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Book Turf
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {match.turfs.name} - {match.turfs.location}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Booking Summary */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center justify-between text-sm">
              <div className="space-y-1">
                <p className="font-medium">{format(new Date(match.match_date), 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimeDisplay(match.match_time)} - {formatTimeDisplay(calculateEndTime(match.match_time, match.duration_minutes).slice(0, 5))} ({match.duration_minutes} mins)
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">₹{totalAmount.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">Total Amount</p>
              </div>
            </div>
          </Card>

          {/* Payment Options */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Choose Payment Method</h3>
            
            {paymentOptions.filter(opt => opt.enabled).map((option) => (
              <Card
                key={option.id}
                className={cn(
                  "p-4 cursor-pointer transition-all border-2",
                  paymentOption === option.id 
                    ? "border-primary bg-primary/5" 
                    : "border-transparent hover:border-muted-foreground/20"
                )}
                onClick={() => setPaymentOption(option.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    paymentOption === option.id ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <option.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{option.title}</p>
                      {option.amount > 0 && (
                        <p className="font-bold text-lg">₹{option.amount.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  {paymentOption === option.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirmPayment}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : paymentOption === 'ground' ? (
              <>
                <Banknote className="h-5 w-5 mr-2" />
                Confirm Booking
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Pay ₹{paymentOption === 'advance' ? advanceAmount.toLocaleString('en-IN') : totalAmount.toLocaleString('en-IN')} Now
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
