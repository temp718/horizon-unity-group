import { supabase } from '@/integrations/supabase/client';

export interface SMSPayload {
  phoneNumber: string;
  message: string;
  userId: string;
  messageType: 'missed_contribution' | 'successful_contribution' | 'admin_notification';
}

// TextLocal API Configuration
const TEXTLOCAL_API_KEY = 'aky_39999NgB2tdhoSkk27QnUzSbQdO';
const TEXTLOCAL_API_URL = 'https://api.textlocal.in/send/';

export const sendSMS = async (payload: SMSPayload): Promise<boolean> => {
  try {
    // Ensure phone number is in valid format (remove any non-digits and ensure it's a valid length)
    const cleanPhoneNumber = payload.phoneNumber.replace(/\D/g, '');
    
    if (!cleanPhoneNumber || cleanPhoneNumber.length < 10) {
      console.error('Invalid phone number format:', payload.phoneNumber);
      return false;
    }

    // Format phone number for TextLocal (add country code if not present)
    let formattedNumber = cleanPhoneNumber;
    if (!formattedNumber.startsWith('91')) {
      // Assuming Indian numbers - adjust as needed
      formattedNumber = '91' + cleanPhoneNumber.slice(-10);
    }

    // Call TextLocal API to send SMS
    const params = new URLSearchParams();
    params.append('apikey', TEXTLOCAL_API_KEY);
    params.append('numbers', formattedNumber);
    params.append('message', payload.message);
    params.append('sender', 'HORIZON'); // Sender ID

    const response = await fetch(TEXTLOCAL_API_URL, {
      method: 'POST',
      body: params,
      headers: {
        'Accept': 'application/json',
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('TextLocal API Error:', data);
      return false;
    }

    console.log('SMS sent successfully via TextLocal:', data);

    // Log SMS record in database for tracking
    await supabase
      .from('sms_logs')
      .insert({
        user_id: payload.userId,
        phone_number: payload.phoneNumber,
        message: payload.message,
        message_type: payload.messageType,
        status: 'sent'
      })
      .catch(err => console.error('Failed to log SMS:', err));

    return true;
  } catch (error) {
    console.error('Failed to send SMS via TextLocal:', error);
    return false;
  }
};

export const sendMissedContributionReminder = async (
  userId: string,
  phoneNumber: string,
  missedDays: number,
  requiredAmount: number
) => {
  const message = `Hi! You've missed ${missedDays} day${missedDays > 1 ? 's' : ''} of contributions. Your next contribution should be KES ${requiredAmount.toLocaleString()} to catch up. Please contribute today on the Horizon Unit app.`;
  
  return sendSMS({
    userId,
    phoneNumber,
    message,
    messageType: 'missed_contribution'
  });
};

export const sendSuccessfulContributionSMS = async (
  userId: string,
  phoneNumber: string,
  amount: number,
  newBalance: number
) => {
  const message = `Great! Your contribution of KES ${amount.toLocaleString()} has been recorded. Your new savings balance is KES ${newBalance.toLocaleString()}. Keep saving! - Horizon Unit`;
  
  return sendSMS({
    userId,
    phoneNumber,
    message,
    messageType: 'successful_contribution'
  });
};

export const sendAdminNotificationSMS = async (
  userId: string,
  phoneNumber: string,
  adminMessage: string
) => {
  const message = `Message from Horizon Unit Admin: ${adminMessage}`;
  
  return sendSMS({
    userId,
    phoneNumber,
    message,
    messageType: 'admin_notification'
  });
};
