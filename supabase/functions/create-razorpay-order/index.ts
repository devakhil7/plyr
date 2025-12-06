import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrderRequest {
  turf_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  amount: number;
  match_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("Razorpay credentials not configured");
      throw new Error("Payment gateway not configured");
    }

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Unauthorized");
    }

    const body: CreateOrderRequest = await req.json();
    console.log("Creating order for:", body);

    // Check if slot is already booked
    const { data: existingBooking, error: checkError } = await supabase
      .from("turf_bookings")
      .select("id")
      .eq("turf_id", body.turf_id)
      .eq("booking_date", body.booking_date)
      .eq("payment_status", "completed")
      .or(`and(start_time.lt.${body.end_time},end_time.gt.${body.start_time})`)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing booking:", checkError);
    }

    if (existingBooking) {
      throw new Error("This slot is already booked");
    }

    // Create Razorpay order
    const orderData = {
      amount: Math.round(body.amount * 100), // Razorpay expects amount in paise
      currency: "INR",
      receipt: `turf_${body.turf_id}_${Date.now()}`,
      notes: {
        turf_id: body.turf_id,
        user_id: user.id,
        booking_date: body.booking_date,
        start_time: body.start_time,
        end_time: body.end_time,
      },
    };

    const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay error:", errorText);
      throw new Error("Failed to create payment order");
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log("Razorpay order created:", razorpayOrder.id);

    // Create booking record with pending status
    const { data: booking, error: bookingError } = await supabase
      .from("turf_bookings")
      .insert({
        turf_id: body.turf_id,
        user_id: user.id,
        match_id: body.match_id || null,
        booking_date: body.booking_date,
        start_time: body.start_time,
        end_time: body.end_time,
        duration_minutes: body.duration_minutes,
        amount_paid: body.amount,
        razorpay_order_id: razorpayOrder.id,
        payment_status: "pending",
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      throw new Error("Failed to create booking record");
    }

    return new Response(
      JSON.stringify({
        order_id: razorpayOrder.id,
        booking_id: booking.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: razorpayKeyId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in create-razorpay-order:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
