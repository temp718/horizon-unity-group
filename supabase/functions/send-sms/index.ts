import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.0";

// TextLocal API Configuration
const TEXTLOCAL_API_KEY = Deno.env.get("TEXTLOCAL_API_KEY") || "aky_39999NgB2tdhoSkk27QnUzSbQdO";
const TEXTLOCAL_API_URL = "https://api.textlocal.in/send/";

interface SMSPayload {
  phoneNumber: string;
  message: string;
  userId: string;
  messageType: string;
}

// Format phone number for different countries
const formatPhoneNumber = (phoneNumber: string): string | null => {
  // Remove all non-digits
  const cleanNumber = phoneNumber.replace(/\D/g, "");
  
  if (!cleanNumber || cleanNumber.length < 10) {
    console.error("Invalid phone number format:", phoneNumber);
    return null;
  }

  // Check if country code already present
  if (cleanNumber.startsWith("254")) {
    // Kenya
    return cleanNumber;
  } else if (cleanNumber.startsWith("91")) {
    // India
    return cleanNumber;
  } else if (cleanNumber.startsWith("1")) {
    // USA/Canada
    return "1" + cleanNumber;
  } else {
    // Default to Kenya (254) if no country code detected
    // Assumes 10-digit Kenyan number or removes leading 0
    let formatted = cleanNumber;
    if (formatted.startsWith("0")) {
      formatted = formatted.substring(1);
    }
    if (formatted.length === 9) {
      return "254" + formatted;
    } else if (formatted.length === 10) {
      return "254" + formatted;
    }
    return null;
  }
};

const sendViaTextLocal = async (
  phoneNumber: string,
  message: string
): Promise<boolean> => {
  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);
    if (!formattedNumber) {
      console.error("Failed to format phone number:", phoneNumber);
      return false;
    }

    // Create request body for TextLocal
    const params = new URLSearchParams();
    params.append("apikey", TEXTLOCAL_API_KEY);
    params.append("numbers", formattedNumber);
    params.append("message", message);
    params.append("sender", "HORIZON");

    const response = await fetch(TEXTLOCAL_API_URL, {
      method: "POST",
      body: params,
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error("TextLocal API Error:", data);
      return false;
    }

    console.log("SMS sent successfully via TextLocal:", data);
    return true;
  } catch (error) {
    console.error("TextLocal error:", error);
    return false;
  }
};

// Fallback SMS provider (using generic HTTP API)
const sendViaSMSProvider = async (
  phoneNumber: string,
  message: string
): Promise<boolean> => {
  try {
    // Fallback to TextLocal if not already used
    return await sendViaTextLocal(phoneNumber, message);
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

    // Send SMS via TextLocal
    const success = await sendViaTextLocal(phoneNumber, message);

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
