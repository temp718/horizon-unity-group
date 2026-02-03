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

// Format phone number for different countries
const formatPhoneNumber = (phoneNumber: string): string | null => {
  // Remove all non-digits
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  if (!cleanNumber || cleanNumber.length < 10) {
    console.error('Invalid phone number format:', phoneNumber);
    return null;
  }

  // Check if country code already present
  if (cleanNumber.startsWith('254')) {
    // Kenya
    return cleanNumber;
  } else if (cleanNumber.startsWith('91')) {
    // India
    return cleanNumber;
  } else if (cleanNumber.startsWith('1')) {
    // USA/Canada
    return '1' + cleanNumber;
  } else {
    // Default to Kenya (254) if no country code detected
    // Assumes 10-digit Kenyan number or removes leading 0
    let formatted = cleanNumber;
    if (formatted.startsWith('0')) {
      formatted = formatted.substring(1);
    }
    if (formatted.length === 9) {
      return '254' + formatted;
    } else if (formatted.length === 10) {
      return '254' + formatted;
    }
    return null;
  }
};

export const sendSMS = async (payload: SMSPayload): Promise<boolean> => {
  try {
    const formattedNumber = formatPhoneNumber(payload.phoneNumber);
    
    if (!formattedNumber) {
      console.error('Failed to format phone number:', payload.phoneNumber);
      return false;
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
