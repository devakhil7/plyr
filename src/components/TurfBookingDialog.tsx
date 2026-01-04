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
import { CalendarSlotPicker } from '@/components/CalendarSlotPicker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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

type PaymentOption = 'full' | 'advance' | 'ground';

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
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('full');
  const [step, setStep] = useState<'slot' | 'payment'>('slot');

  // Fetch turf payment settings
  const { data: turfSettings } = useQuery({
    queryKey: ['turf-payment-settings', turf?.id],
    queryFn: async () => {
      if (!turf?.id) return null;
      const { data } = await supabase
        .from('turfs')
        .select('allow_advance_payment, advance_amount_type, advance_amount_value, allow_pay_at_ground')
        .eq('id', turf.id)
        .single();
      return data;
    },
    enabled: !!turf?.id,
  });

  const pricePerHour = turf?.price_per_hour || 0;
  const totalAmount = (pricePerHour * duration) / 60;

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
    if (!user || !turf || !selectedTime) {
      toast.error('Please select a time slot');
      return;
    }

    setIsProcessing(true);

    try {
      const endMinutes = timeToMinutes(selectedTime) + duration;
      const endTime = minutesToTime(endMinutes);

      // Create booking directly with pay_at_ground status
      // booking_status is pending_approval since no payment was made (turf owner needs to approve)
      const { data: booking, error } = await supabase
        .from('turf_bookings')
        .insert({
          turf_id: turf.id,
          user_id: user.id,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: selectedTime,
          end_time: endTime,
          duration_minutes: duration,
          amount_paid: 0,
          payment_status: 'pay_at_ground',
          booking_status: 'pending_approval',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Booking request sent! Waiting for turf owner approval.');
      onOpenChange(false);
      onBookingComplete?.();
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
    if (!user || !turf || !selectedTime) {
      toast.error('Please select a time slot');
      return;
    }

    setIsProcessing(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      const endMinutes = timeToMinutes(selectedTime) + duration;
      const endTime = minutesToTime(endMinutes);

      // Create order
      const response = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          turf_id: turf.id,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: selectedTime,
          end_time: endTime,
          duration_minutes: duration,
          amount: amount,
          total_amount: totalAmount,
          is_advance: isAdvance,
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
          ? `Advance Payment - ${turf.name} (₹${remainingAmount} to be paid at ground)`
          : `Turf Booking - ${turf.name}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const verifyResponse = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
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

  const handleContinueToPayment = () => {
    if (!selectedTime) {
      toast.error('Please select a time slot');
      return;
    }
    setStep('payment');
  };

  if (!turf) return null;

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
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        setStep('slot');
        setPaymentOption('full');
      }
      onOpenChange(newOpen);
    }}>
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

        {step === 'slot' ? (
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
                onClick={handleContinueToPayment}
                disabled={!selectedTime}
                className="w-full"
                size="lg"
              >
                Continue to Payment
              </Button>
            </Card>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Back button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setStep('slot')}
              className="mb-2"
            >
              ← Change slot
            </Button>

            {/* Booking Summary */}
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center justify-between text-sm">
                <div className="space-y-1">
                  <p className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-muted-foreground">
                    {selectedTime} - {minutesToTime(timeToMinutes(selectedTime) + duration)} ({duration} mins)
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
        )}
      </DialogContent>
    </Dialog>
  );
};
