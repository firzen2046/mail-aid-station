-- Drop public access policies (security fix)
DROP POLICY IF EXISTS "Public can view customers by phone" ON public.customers;
DROP POLICY IF EXISTS "Public can view mails" ON public.mails;