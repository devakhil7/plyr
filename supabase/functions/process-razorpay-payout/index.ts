import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessPayoutRequest {
  payout_id: string;
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

    // Get user from token and verify admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Unauthorized");
    }

    // Verify admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      throw new Error("Only admins can process payouts");
    }

    const body: ProcessPayoutRequest = await req.json();
    console.log("Processing payout:", body.payout_id);

    // Get payout details
    const { data: payout, error: payoutError } = await supabase
      .from("payouts")
      .select("*, turfs(id, name)")
      .eq("id", body.payout_id)
      .single();

    if (payoutError || !payout) {
      console.error("Payout not found:", payoutError);
      throw new Error("Payout not found");
    }

    if (payout.status === "paid") {
      throw new Error("Payout already processed");
    }

    // Get turf payout details (bank info)
    const { data: payoutDetails, error: payoutDetailsError } = await supabase
      .from("turf_payout_details")
      .select("*")
      .eq("turf_id", payout.turf_id)
      .single();

    if (payoutDetailsError || !payoutDetails) {
      console.error("Payout details not found:", payoutDetailsError);
      throw new Error("Turf bank details not configured. Please add bank details in turf settings.");
    }

    // Validate bank details
    if (!payoutDetails.account_number || !payoutDetails.ifsc_code || !payoutDetails.account_name) {
      throw new Error("Incomplete bank details. Please ensure account number, IFSC code, and account name are configured.");
    }

    const amountInPaise = Math.round(Number(payout.amount_net) * 100);
    const referenceId = `payout_${payout.id.slice(0, 8)}_${Date.now()}`;

    // First, create a Fund Account for the turf owner (required by Razorpay Payouts)
    const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    // Create contact first
    const contactResponse = await fetch("https://api.razorpay.com/v1/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        name: payoutDetails.account_name,
        type: "vendor",
        reference_id: `turf_${payout.turf_id.slice(0, 8)}`,
        notes: {
          turf_id: payout.turf_id,
          turf_name: payout.turfs?.name || "Unknown",
        },
      }),
    });

    if (!contactResponse.ok) {
      const contactError = await contactResponse.text();
      console.error("Error creating contact:", contactError);
      // Try to get existing contact
      const existingContactResponse = await fetch(
        `https://api.razorpay.com/v1/contacts?reference_id=turf_${payout.turf_id.slice(0, 8)}`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );
      
      if (!existingContactResponse.ok) {
        throw new Error("Failed to create or retrieve contact");
      }
      
      const existingContacts = await existingContactResponse.json();
      if (!existingContacts.items || existingContacts.items.length === 0) {
        throw new Error("Failed to create contact for payout");
      }
    }

    const contact = contactResponse.ok 
      ? await contactResponse.json()
      : (await (await fetch(
          `https://api.razorpay.com/v1/contacts?reference_id=turf_${payout.turf_id.slice(0, 8)}`,
          { headers: { Authorization: `Basic ${credentials}` } }
        )).json()).items[0];

    console.log("Contact created/retrieved:", contact.id);

    // Create fund account
    const fundAccountResponse = await fetch("https://api.razorpay.com/v1/fund_accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        contact_id: contact.id,
        account_type: "bank_account",
        bank_account: {
          name: payoutDetails.account_name,
          ifsc: payoutDetails.ifsc_code,
          account_number: payoutDetails.account_number,
        },
      }),
    });

    let fundAccount;
    if (!fundAccountResponse.ok) {
      const fundError = await fundAccountResponse.text();
      console.error("Error creating fund account:", fundError);
      
      // Try to get existing fund account
      const existingFundResponse = await fetch(
        `https://api.razorpay.com/v1/fund_accounts?contact_id=${contact.id}`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );
      
      if (!existingFundResponse.ok) {
        throw new Error("Failed to create or retrieve fund account");
      }
      
      const existingFunds = await existingFundResponse.json();
      if (!existingFunds.items || existingFunds.items.length === 0) {
        throw new Error("Failed to create fund account for payout");
      }
      fundAccount = existingFunds.items[0];
    } else {
      fundAccount = await fundAccountResponse.json();
    }

    console.log("Fund account created/retrieved:", fundAccount.id);

    // Create payout
    const payoutResponse = await fetch("https://api.razorpay.com/v1/payouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        account_number: Deno.env.get("RAZORPAY_ACCOUNT_NUMBER") || "", // This should be set to your Razorpay X account number
        fund_account_id: fundAccount.id,
        amount: amountInPaise,
        currency: "INR",
        mode: "IMPS", // IMPS for instant transfer, NEFT for batch
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: referenceId,
        narration: `Payout for ${payout.turfs?.name || "Turf"}`,
        notes: {
          payout_id: payout.id,
          turf_id: payout.turf_id,
          period: `${payout.period_start} to ${payout.period_end}`,
        },
      }),
    });

    if (!payoutResponse.ok) {
      const payoutError = await payoutResponse.text();
      console.error("Error creating payout:", payoutError);
      
      // If Razorpay X is not enabled, we'll just mark the payout as processed manually
      console.log("Razorpay X Payouts API may not be enabled. Marking payout as processed for manual transfer.");
      
      // Update payout status to pending manual transfer
      const { error: updateError } = await supabase
        .from("payouts")
        .update({
          status: "scheduled",
          payout_reference: `MANUAL_${referenceId}`,
        })
        .eq("id", body.payout_id);

      if (updateError) {
        console.error("Error updating payout:", updateError);
        throw new Error("Failed to update payout status");
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Razorpay X Payouts not enabled. Payout marked for manual processing.",
          manual: true,
          reference: `MANUAL_${referenceId}`,
          bank_details: {
            account_name: payoutDetails.account_name,
            bank_name: payoutDetails.bank_name,
            account_number: payoutDetails.account_number?.slice(-4),
            ifsc_code: payoutDetails.ifsc_code,
            amount: payout.amount_net,
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const razorpayPayout = await payoutResponse.json();
    console.log("Razorpay payout created:", razorpayPayout.id);

    // Update payout record with Razorpay reference
    const { error: updateError } = await supabase
      .from("payouts")
      .update({
        status: razorpayPayout.status === "processed" ? "paid" : "scheduled",
        payout_reference: razorpayPayout.id,
        payout_date: razorpayPayout.status === "processed" ? new Date().toISOString() : null,
      })
      .eq("id", body.payout_id);

    if (updateError) {
      console.error("Error updating payout:", updateError);
      throw new Error("Failed to update payout status");
    }

    console.log("Payout processed successfully:", razorpayPayout.id);

    return new Response(
      JSON.stringify({
        success: true,
        razorpay_payout_id: razorpayPayout.id,
        status: razorpayPayout.status,
        utr: razorpayPayout.utr,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in process-razorpay-payout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
