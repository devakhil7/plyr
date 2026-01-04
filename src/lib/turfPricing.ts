import { getDay } from 'date-fns';
import type { Json } from '@/integrations/supabase/types';

export interface PricingRule {
  days: string[];
  startTime: string;
  endTime: string;
  pricePerHour: number;
}

export interface PricingRules {
  rules?: PricingRule[];
}

const DAY_MAP: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

/**
 * Get the effective hourly rate for a specific date and time based on pricing rules
 */
export const getEffectiveHourlyRate = (
  basePrice: number,
  pricingRules: PricingRules | null | undefined,
  date: Date,
  time: string
): number => {
  if (!pricingRules?.rules || pricingRules.rules.length === 0) {
    return basePrice;
  }

  const dayOfWeek = DAY_MAP[getDay(date)];
  const timeMinutes = timeToMinutes(time);

  // Find matching rule
  for (const rule of pricingRules.rules) {
    if (!rule.days.includes(dayOfWeek)) continue;

    const ruleStart = timeToMinutes(rule.startTime);
    const ruleEnd = timeToMinutes(rule.endTime);

    // Check if the time falls within this rule's time range
    if (timeMinutes >= ruleStart && timeMinutes < ruleEnd) {
      return rule.pricePerHour;
    }
  }

  return basePrice;
};

/**
 * Calculate total price for a booking considering peak pricing rules
 * This handles cases where a booking spans multiple pricing periods
 */
export const calculateBookingPrice = (
  basePrice: number,
  pricingRules: PricingRules | null | undefined,
  date: Date,
  startTime: string,
  durationMinutes: number
): number => {
  if (!pricingRules?.rules || pricingRules.rules.length === 0) {
    return (basePrice * durationMinutes) / 60;
  }

  const dayOfWeek = DAY_MAP[getDay(date)];
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;

  let totalPrice = 0;
  let currentMinute = startMinutes;

  // Process in 30-minute chunks to accurately calculate price across different periods
  while (currentMinute < endMinutes) {
    const chunkEnd = Math.min(currentMinute + 30, endMinutes);
    const chunkDuration = chunkEnd - currentMinute;

    // Find applicable rate for this chunk
    let rateForChunk = basePrice;
    
    for (const rule of pricingRules.rules) {
      if (!rule.days.includes(dayOfWeek)) continue;

      const ruleStart = timeToMinutes(rule.startTime);
      const ruleEnd = timeToMinutes(rule.endTime);

      // Check if this chunk falls within the rule's time range
      if (currentMinute >= ruleStart && currentMinute < ruleEnd) {
        rateForChunk = rule.pricePerHour;
        break;
      }
    }

    // Add price for this chunk
    totalPrice += (rateForChunk * chunkDuration) / 60;
    currentMinute = chunkEnd;
  }

  return Math.round(totalPrice);
};

/**
 * Get a display-friendly price range string if peak pricing exists
 */
export const getPriceRangeDisplay = (
  basePrice: number,
  pricingRules: PricingRules | null | undefined
): { min: number; max: number; hasPeakPricing: boolean } => {
  if (!pricingRules?.rules || pricingRules.rules.length === 0) {
    return { min: basePrice, max: basePrice, hasPeakPricing: false };
  }

  const allPrices = [basePrice, ...pricingRules.rules.map(r => r.pricePerHour)];
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);

  return { min, max, hasPeakPricing: max > min };
};
