import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== 'string') {
      console.log('Invalid phone number provided');
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedPhone = phone.trim();
    console.log(`Looking up customer with phone: ${trimmedPhone}`);

    // Create Supabase client with service role key for privileged access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up customer by phone
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, customer_id, full_name, phone')
      .eq('phone', trimmedPhone)
      .maybeSingle();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      throw customerError;
    }

    if (!customer) {
      console.log('No customer found with this phone number');
      return new Response(
        JSON.stringify({ customer: null, pendingMails: [], pickedUpMails: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found customer: ${customer.customer_id} - ${customer.full_name}`);

    // Fetch mails for this customer
    const { data: mails, error: mailsError } = await supabase
      .from('mails')
      .select('id, sender, photos, status, pickup_time, pickup_method, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (mailsError) {
      console.error('Error fetching mails:', mailsError);
      throw mailsError;
    }

    const allMails = mails || [];
    const pendingMails = allMails.filter(m => m.status === '待取');
    const pickedUpMails = allMails.filter(m => m.status === '已取');

    console.log(`Found ${pendingMails.length} pending mails and ${pickedUpMails.length} picked up mails`);

    return new Response(
      JSON.stringify({
        customer: {
          id: customer.id,
          customer_id: customer.customer_id,
          full_name: customer.full_name,
          phone: customer.phone,
        },
        pendingMails,
        pickedUpMails,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in customer-lookup function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
