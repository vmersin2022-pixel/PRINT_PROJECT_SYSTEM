
-- ==========================================
-- СКРИПТ НАСТРОЙКИ ПРАВ ДОСТУПА (RLS)
-- Запустите это в Supabase -> SQL Editor
-- ==========================================

-- 1. Отключаем RLS (Row Level Security) для основных таблиц
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- 2. Настройка таблицы профилей (profiles)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Anyone can update profiles" ON public.profiles FOR UPDATE USING (true);

-- 3. Добавляем поля для CRM и ЛК
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shipping_info jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points integer DEFAULT 0;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;

-- 4. НОВЫЕ ПОЛЯ ДЛЯ УМНОГО СКЛАДА (v2)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id text REFERENCES public.products(id) ON DELETE CASCADE,
    variant_size text,
    change_amount integer,
    reason text, 
    user_id uuid,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.inventory_logs DISABLE ROW LEVEL SECURITY;

-- 5. КОНСТРУКТОР ПРОМОКОДОВ 2.0
ALTER TABLE public.promocodes ADD COLUMN IF NOT EXISTS usage_limit integer DEFAULT NULL;
ALTER TABLE public.promocodes ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;
ALTER TABLE public.promocodes ADD COLUMN IF NOT EXISTS min_order_amount integer DEFAULT 0;
ALTER TABLE public.promocodes ADD COLUMN IF NOT EXISTS target_audience text DEFAULT 'all';

-- 6. RFM ANALYTICS VIEW
DROP VIEW IF EXISTS public.customer_segments;
CREATE OR REPLACE VIEW public.customer_segments AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.telegram_id,
    p.avatar_url,
    p.created_at,
    p.notes,
    p.phone,
    p.is_blocked,
    p.loyalty_points,
    p.role,
    p.shipping_info,
    COALESCE(SUM(o.total_price) FILTER (WHERE o.status != 'cancelled'), 0) as total_spent,
    COUNT(o.id) FILTER (WHERE o.status != 'cancelled') as orders_count,
    MAX(o.created_at) as last_order_date,
    CASE 
        WHEN COALESCE(SUM(o.total_price) FILTER (WHERE o.status != 'cancelled'), 0) > 50000 THEN 'whale'
        WHEN COUNT(o.id) FILTER (WHERE o.status != 'cancelled' AND o.created_at > (now() - interval '30 days')) > 2 THEN 'hot'
        WHEN MAX(o.created_at) < (now() - interval '90 days') THEN 'churn'
        WHEN MAX(o.created_at) IS NULL AND p.created_at > (now() - interval '30 days') THEN 'new'
        ELSE 'regular'
    END as segment
FROM public.profiles p
LEFT JOIN public.orders o ON p.id = o.user_id
GROUP BY p.id;

-- Ensure permissions for the view
GRANT SELECT ON public.customer_segments TO anon, authenticated, service_role;

-- 7. HEADLESS CMS CONFIG (NEW)
-- Таблица для глобальных настроек сайта. Всегда одна строка ID=1.
CREATE TABLE IF NOT EXISTS public.site_config (
    id int PRIMARY KEY DEFAULT 1,
    hero_title text DEFAULT 'PRINT PROJECT GAME',
    hero_subtitle text DEFAULT 'СИНХРОНИЗИРУЙ_СВОЙ_СТИЛЬ',
    hero_image text,
    announcement_text text DEFAULT 'Бесплатная доставка от 5000 ₽',
    sale_mode boolean DEFAULT false,
    sale_end_date timestamptz,
    CONSTRAINT one_row_only CHECK (id = 1)
);

-- Инициализация конфига, если его нет
INSERT INTO public.site_config (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.site_config DISABLE ROW LEVEL SECURITY;

-- 8. Права на Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Images are publicly accessible" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );
CREATE POLICY "Anyone can upload images" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'images' );
CREATE POLICY "Anyone can update images" ON storage.objects FOR UPDATE USING ( bucket_id = 'images' );
