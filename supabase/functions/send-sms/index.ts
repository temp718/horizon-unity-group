import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.0";

// SMS provider config - using Twilio or similar
const SMS_PROVIDER = Deno.env.get("SMS_PROVIDER") || "twilio";
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

interface SMSPayload {
  phoneNumber: string;
  message: string;
  userId: string;
  messageType: string;
}

const sendViaTwilio = async (
  phoneNumber: string,
  message: string
): Promise<boolean> => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("Twilio credentials not configured");
    return false;
  }

  try {
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: phoneNumber,
          Body: message,
        }).toString(),
      }
    );

    const data = await response.json();
    return response.ok && !!data.sid;
  } catch (error) {
    console.error("Twilio error:", error);
    return false;
  }
};

// Fallback SMS provider (using generic HTTP API)
const sendViaSMSProvider = async (
  phoneNumber: string,
  message: string
): Promise<boolean> => {
  try {
    // You can implement any SMS provider API here
    // For now, we'll use a mock implementation that logs to console
    console.log(`SMS to ${phoneNumber}: ${message}`);
    return true;
  } catch (error) {
    console.error("SMS provider error:", error);
    return false;
  }
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const payload: SMSPayload = await req.json();

    const { phoneNumber, message, userId, messageType } = payload;

    if (!phoneNumber || !message || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format phone number (basic validation)
    const formattedPhone = phoneNumber.replace(/\D/g, "");
    if (formattedPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send SMS based on provider
    let success = false;
    if (SMS_PROVIDER === "twilio") {
      success = await sendViaTwilio(`+${formattedPhone}`, message);
    } else {
      success = await sendViaSMSProvider(phoneNumber, message);
    }

    if (!success) {
      return new Response(
        JSON.stringify({ error: "Failed to send SMS" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log the SMS in the database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabase.from("sms_logs").insert({
      user_id: userId,
      phone_number: phoneNumber,
      message,
      message_type: messageType,
      status: "sent",
    });

    return new Response(
      JSON.stringify({ success: true, message: "SMS sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
