
-- 1. СЕБЕСТОИМОСТЬ ДЛЯ АНАЛИТИКИ
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

-- 2. ФУНКЦИЯ ПРОВЕРКИ АДМИНА
-- Используется в RLS политиках для безопасности
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ТАБЛИЦА ПРОФИЛЕЙ (CRM ПОЛЯ)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- 4. RLS ПОЛИТИКИ (Безопасность)
-- Позволяем админу видеть и редактировать всё
DROP POLICY IF EXISTS "Admin Full Access Products" ON public.products;
CREATE POLICY "Admin Full Access Products" ON public.products FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin Full Access Orders" ON public.orders;
CREATE POLICY "Admin Full Access Orders" ON public.orders FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- 5. ТАБЛИЦА ТИКЕТОВ ПОДДЕРЖКИ
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    order_id uuid REFERENCES public.orders(id),
    reason text NOT NULL,
    description text,
    photo_proof text,
    status text DEFAULT 'open',
    admin_response text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all tickets" ON public.support_tickets FOR ALL USING (public.is_admin());
