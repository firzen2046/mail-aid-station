-- Drop ALL existing policies on customers table
DROP POLICY IF EXISTS "Authenticated users can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;

-- Drop ALL existing policies on mails table
DROP POLICY IF EXISTS "Authenticated users can view all mails" ON public.mails;
DROP POLICY IF EXISTS "Authenticated users can insert mails" ON public.mails;
DROP POLICY IF EXISTS "Authenticated users can update mails" ON public.mails;
DROP POLICY IF EXISTS "Authenticated users can delete mails" ON public.mails;

-- Recreate proper RLS policies for customers table
-- Authenticated employees can perform all operations
CREATE POLICY "Employees can view all customers"
ON public.customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Employees can insert customers"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Employees can update customers"
ON public.customers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Employees can delete customers"
ON public.customers FOR DELETE
TO authenticated
USING (true);

-- Anonymous users can view customers (for public lookup page)
CREATE POLICY "Public lookup can view customers"
ON public.customers FOR SELECT
TO anon
USING (true);

-- Recreate proper RLS policies for mails table
-- Authenticated employees can perform all operations
CREATE POLICY "Employees can view all mails"
ON public.mails FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Employees can insert mails"
ON public.mails FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Employees can update mails"
ON public.mails FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Employees can delete mails"
ON public.mails FOR DELETE
TO authenticated
USING (true);

-- Anonymous users can view mails (for public customer lookup page)
CREATE POLICY "Public lookup can view mails"
ON public.mails FOR SELECT
TO anon
USING (true);