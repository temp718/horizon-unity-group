-- Add new columns to profiles table for balance visibility and contribution settings
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS balance_hidden BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS default_contribution_amount DECIMAL(10,2) NOT NULL DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS balance_visible_at TIMESTAMP WITH TIME ZONE;

-- Create admin_messages table for admin-to-user communications
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create balance_adjustments table to track manual balance changes by admin
CREATE TABLE IF NOT EXISTS public.balance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('add', 'deduct')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create missed_contribution_tracking table to track missed contributions
CREATE TABLE IF NOT EXISTS public.missed_contribution_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  missed_date DATE NOT NULL,
  penalty_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  penalty_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missed_contribution_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_messages
CREATE POLICY "Users can view messages sent to them" 
ON public.admin_messages FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = admin_id);

CREATE POLICY "Admins can view all messages" 
ON public.admin_messages FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create messages" 
ON public.admin_messages FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for balance_adjustments
CREATE POLICY "Users can view adjustments to their account" 
ON public.balance_adjustments FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all adjustments" 
ON public.balance_adjustments FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create adjustments" 
ON public.balance_adjustments FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for missed_contribution_tracking
CREATE POLICY "Users can view their missed contributions" 
ON public.missed_contribution_tracking FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage missed contributions" 
ON public.missed_contribution_tracking FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for admin_messages updated_at
CREATE TRIGGER update_admin_messages_updated_at
BEFORE UPDATE ON public.admin_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate total user balance (contributions + adjustments)
CREATE OR REPLACE FUNCTION public.get_user_total_balance(p_user_id UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(SUM(CASE WHEN c.status = 'completed' THEN c.amount ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN ba.adjustment_type = 'add' THEN ba.amount WHEN ba.adjustment_type = 'deduct' THEN -ba.amount ELSE 0 END), 0)
  FROM contributions c
  LEFT JOIN balance_adjustments ba ON ba.user_id = c.user_id
  WHERE c.user_id = p_user_id
$$;
