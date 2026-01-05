// Booking status utilities for auto-determining status based on time

export type ComputedBookingStatus = 'pending_approval' | 'lapsed' | 'approved' | 'rejected';

interface BookingTimeInfo {
  booking_date: string;
  start_time: string;
  booking_status: string;
}

/**
 * Computes the effective status of a booking based on its scheduled time
 * Pay-at-ground bookings that weren't approved before start time are considered "lapsed"
 */
export function computeBookingStatus(booking: BookingTimeInfo): ComputedBookingStatus {
  // If already approved or rejected, return as-is
  if (booking.booking_status === 'approved' || booking.booking_status === 'rejected') {
    return booking.booking_status as ComputedBookingStatus;
  }
  
  // If pending, check if start time has passed
  if (booking.booking_status === 'pending_approval') {
    const now = new Date();
    
    // Parse booking start time
    const [hours, minutes] = booking.start_time.split(':').map(Number);
    const bookingStart = new Date(booking.booking_date);
    bookingStart.setHours(hours, minutes, 0, 0);
    
    // If start time has passed, mark as lapsed
    if (now > bookingStart) {
      return 'lapsed';
    }
    
    return 'pending_approval';
  }
  
  // Default fallback
  return booking.booking_status as ComputedBookingStatus;
}

/**
 * Check if a pending booking has lapsed (start time passed without approval)
 */
export function hasBookingLapsed(booking: BookingTimeInfo): boolean {
  return computeBookingStatus(booking) === 'lapsed';
}

/**
 * Check if a booking is still actionable (can be approved/rejected)
 */
export function isBookingActionable(booking: BookingTimeInfo): boolean {
  const status = computeBookingStatus(booking);
  return status === 'pending_approval';
}
