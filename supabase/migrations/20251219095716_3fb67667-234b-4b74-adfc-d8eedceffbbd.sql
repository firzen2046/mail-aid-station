-- Create settings table for storing configuration
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view settings
CREATE POLICY "Authenticated users can view settings" 
ON public.settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Only authenticated users can update settings
CREATE POLICY "Authenticated users can update settings" 
ON public.settings 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Only authenticated users can insert settings
CREATE POLICY "Authenticated users can insert settings" 
ON public.settings 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.settings (key, value, description) VALUES
('timelinesai_webhook_url', '', 'TimelinesAI Inbound Webhook URL for WhatsApp notifications');