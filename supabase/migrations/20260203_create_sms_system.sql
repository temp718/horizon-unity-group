-- Create SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('missed_contribution', 'successful_contribution', 'admin_notification')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at);

-- Enable RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own SMS logs"
  ON sms_logs
  FOR SELECT
  USING (auth.uid() = user_id OR 
         EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can insert SMS logs"
  ON sms_logs
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Add sms_enabled column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT TRUE;

-- Add last_missed_reminder_sent column to track when reminders were sent
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_missed_reminder_sent TIMESTAMP WITH TIME ZONE DEFAULT NULL;
