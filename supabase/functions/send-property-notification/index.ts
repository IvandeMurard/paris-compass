
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, propertyId, searchName } = await req.json();

    if (!userId || !propertyId) {
      return new Response(
        JSON.stringify({ error: "User ID and property ID are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get user preferences to check if they want email notifications
    const { data: userPrefs, error: prefError } = await supabaseClient
      .from('user_preferences')
      .select('email_notifications')
      .eq('user_id', userId)
      .single();

    if (prefError || !userPrefs) {
      return new Response(
        JSON.stringify({ error: "Could not retrieve user preferences" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!userPrefs.email_notifications) {
      return new Response(
        JSON.stringify({ message: "User has email notifications disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get property details
    const { data: property, error: propError } = await supabaseClient
      .from('saved_properties')
      .select('property_data')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      return new Response(
        JSON.stringify({ error: "Could not retrieve property data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Get user email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Could not retrieve user data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const userEmail = userData.user.email;

    // In a real application, you would now send an email
    // For now, we'll just log the action and return success
    console.log(`Notification would be sent to ${userEmail} about property ${propertyId}`);

    // In a production app, you would use a service like SendGrid, AWS SES, etc.
    // Example pseudocode:
    // await sendEmail({
    //   to: userEmail,
    //   subject: `New Property Match: ${searchName}`,
    //   html: `<p>We found a new property matching your search: ${searchName}</p>
    //          <p>Property details: ${JSON.stringify(property.property_data)}</p>
    //          <a href="https://yourapp.com/property/${propertyId}">View Property</a>`
    // });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notification would be sent to ${userEmail}` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
