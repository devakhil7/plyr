// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {

const testUsers = [
  { name: "Aarav Mehta", email: "aarav.mehta@sportsiq.com", phone: "+91 9000010001" },
  { name: "Rohan Iyer", email: "rohan.iyer@sportsiq.com", phone: "+91 9000010002" },
  { name: "Kunal Verma", email: "kunal.verma@sportsiq.com", phone: "+91 9000010003" },
  { name: "Siddharth Rao", email: "siddharth.rao@sportsiq.com", phone: "+91 9000010004" },
  { name: "Arjun Malhotra", email: "arjun.malhotra@sportsiq.com", phone: "+91 9000010005" },
  { name: "Aditya Kulkarni", email: "aditya.kulkarni@sportsiq.com", phone: "+91 9000010006" },
  { name: "Nikhil Sharma", email: "nikhil.sharma@sportsiq.com", phone: "+91 9000010007" },
  { name: "Pranav Joshi", email: "pranav.joshi@sportsiq.com", phone: "+91 9000010008" },
  { name: "Varun Chatterjee", email: "varun.chatterjee@sportsiq.com", phone: "+91 9000010009" },
  { name: "Abhishek Nair", email: "abhishek.nair@sportsiq.com", phone: "+91 9000010010" },
  { name: "Rahul Sengupta", email: "rahul.sengupta@sportsiq.com", phone: "+91 9000010011" },
  { name: "Aman Gupta", email: "aman.gupta@sportsiq.com", phone: "+91 9000010012" },
  { name: "Saurabh Mishra", email: "saurabh.mishra@sportsiq.com", phone: "+91 9000010013" },
  { name: "Yash Patel", email: "yash.patel@sportsiq.com", phone: "+91 9000010014" },
  { name: "Deepak Reddy", email: "deepak.reddy@sportsiq.com", phone: "+91 9000010015" },
  { name: "Mohit Bansal", email: "mohit.bansal@sportsiq.com", phone: "+91 9000010016" },
  { name: "Akash Pillai", email: "akash.pillai@sportsiq.com", phone: "+91 9000010017" },
  { name: "Shreyas Deshpande", email: "shreyas.deshpande@sportsiq.com", phone: "+91 9000010018" },
  { name: "Karthik Subramanian", email: "karthik.subramanian@sportsiq.com", phone: "+91 9000010019" },
  { name: "Ritesh Jain", email: "ritesh.jain@sportsiq.com", phone: "+91 9000010020" },
  { name: "Vinayak Sawant", email: "vinayak.sawant@sportsiq.com", phone: "+91 9000010021" },
  { name: "Harsh Vardhan", email: "harsh.vardhan@sportsiq.com", phone: "+91 9000010022" },
  { name: "Manish Thakur", email: "manish.thakur@sportsiq.com", phone: "+91 9000010023" },
  { name: "Ankit Srivastava", email: "ankit.srivastava@sportsiq.com", phone: "+91 9000010024" },
  { name: "Raghav Khanna", email: "raghav.khanna@sportsiq.com", phone: "+91 9000010025" },
];

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results = [];
    
    for (const user of testUsers) {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: "TestPassword123!",
        email_confirm: true,
        user_metadata: { name: user.name },
      });

      if (authError) {
        results.push({ email: user.email, success: false, error: authError.message });
        continue;
      }

      // Update profile with phone
      if (authData.user) {
        await supabaseAdmin
          .from("profiles")
          .update({ phone: user.phone, profile_completed: true })
          .eq("id", authData.user.id);
      }

      results.push({ email: user.email, success: true, userId: authData.user?.id });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
