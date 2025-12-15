import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  teamId: string;
  tournamentId: string;
  amount: number;
  isAdvance: boolean;
}

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const message = orderId + "|" + paymentId;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
  const signatureArray = new Uint8Array(signatureBuffer);
  const expectedSignature = Array.from(signatureArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSignature === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!razorpayKeySecret) {
      throw new Error("Razorpay secret not configured");
    }

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      teamId,
      tournamentId,
      amount,
      isAdvance,
    }: VerifyPaymentRequest = await req.json();

    // Verify signature
    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret
    );

    if (!isValid) {
      throw new Error("Invalid payment signature");
    }

    // Get tournament for turf_id
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("turf_id, entry_fee")
      .eq("id", tournamentId)
      .single();

    // Get current team data
    const { data: currentTeam } = await supabase
      .from("tournament_teams")
      .select("total_paid, total_fee")
      .eq("id", teamId)
      .single();

    const newTotalPaid = (currentTeam?.total_paid || 0) + amount;
    const totalFee = currentTeam?.total_fee || tournament?.entry_fee || 0;
    const newPaymentStatus = newTotalPaid >= totalFee ? "paid" : "partial";

    // Create payment record
    const { error: paymentError } = await supabase.from("payments").insert({
      payer_id: user.id,
      tournament_id: tournamentId,
      tournament_team_id: teamId,
      amount_total: amount,
      currency: "INR",
      payment_method: "razorpay",
      payment_purpose: isAdvance ? "tournament_entry_advance" : "tournament_entry_full",
      payment_reference: razorpay_payment_id,
      is_advance: isAdvance,
      status: "paid",
      paid_at: new Date().toISOString(),
      turf_id: tournament?.turf_id || null,
      platform_fee: 0,
      turf_amount: 0,
    });

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
      throw new Error("Failed to record payment");
    }

    // Update team status
    const { error: updateError } = await supabase
      .from("tournament_teams")
      .update({
        total_paid: newTotalPaid,
        payment_status: newPaymentStatus,
        team_status: "pending_roster",
        registration_status: "confirmed",
        payment_reference: razorpay_payment_id,
      })
      .eq("id", teamId);

    if (updateError) {
      console.error("Team update error:", updateError);
      throw new Error("Failed to update team status");
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentStatus: newPaymentStatus,
        totalPaid: newTotalPaid,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
