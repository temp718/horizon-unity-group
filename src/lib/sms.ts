import { supabase } from '@/integrations/supabase/client';

export interface SMSPayload {
  phoneNumber: string;
  message: string;
  userId: string;
  messageType: 'missed_contribution' | 'successful_contribution' | 'admin_notification';
}

export const sendSMS = async (payload: SMSPayload): Promise<boolean> => {
  try {
    // Call Supabase Edge Function to send SMS
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: payload
    });

    if (error) {
      console.error('SMS Error:', error);
      return false;
    }

    console.log('SMS sent successfully:', data);

    // Log SMS record in database for tracking
    await supabase
      .from('sms_logs')
      .insert({
        user_id: payload.userId,
        phone_number: payload.phoneNumber,
        message: payload.message,
        message_type: payload.messageType,
        status: 'sent'
      });

    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
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
