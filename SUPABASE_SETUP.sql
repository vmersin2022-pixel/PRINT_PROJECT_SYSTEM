
-- ==========================================
-- 🛡️ SECURITY & RLS SETUP (HARDENED)
-- Запустите это в Supabase -> SQL Editor
-- ==========================================

-- 1. Enable RLS on ALL tables (Lockdown Mode)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 2. Create Admin Check Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. POLICIES (Правила доступа)

-- ... (Previous Policies - kept same for brevity, ensure they are applied) ...
-- Re-applying critical ones just in case:
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin Full Products" ON public.products FOR ALL USING (is_admin());
CREATE POLICY "Public Read Variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Admin Full Variants" ON public.product_variants FOR ALL USING (is_admin());
CREATE POLICY "Public Read Collections" ON public.collections FOR SELECT USING (true);
CREATE POLICY "Admin Full Collections" ON public.collections FOR ALL USING (is_admin());
CREATE POLICY "Admin Full Orders" ON public.orders FOR ALL USING (is_admin());
CREATE POLICY "User Read Own Orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
-- Note: "User Create Orders" policy is no longer strictly needed for INSERT if we use RPC with security definer, 
-- but good to keep for direct API usage if ever needed.
CREATE POLICY "User Create Orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id); 
CREATE POLICY "Public Read Config" ON public.site_config FOR SELECT USING (true);
CREATE POLICY "Admin Update Config" ON public.site_config FOR UPDATE USING (is_admin());

-- Ensure site config exists
INSERT INTO public.site_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS vip_threshold integer DEFAULT 15000;

-- --- PROFILE SECURITY UPGRADE ---
-- Drop old policies to avoid conflict
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- Allow users to read their own profile (and admins to read all)
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin read all profiles" ON public.profiles FOR SELECT USING (is_admin());

-- STRICT UPDATE POLICY: Prevent points hacking
CREATE POLICY "Users update own basic info" ON public.profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    AND (
        -- PREVENT CHANGING THESE FIELDS:
        OLD.loyalty_points = NEW.loyalty_points
        AND OLD.role = NEW.role
        AND OLD.telegram_id = NEW.telegram_id -- Prevent hijacking TG binding
    )
);

-- Allow inserting own profile on auth (usually via trigger, but allowed for client creation if needed)
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);


-- 4. ATOMIC ORDER PROCESSING FUNCTION (The Core Logic)
-- This function handles the entire checkout process in a single transaction.
CREATE OR REPLACE FUNCTION public.create_new_order(
    p_items jsonb,             -- Array of {id, selectedSize, quantity}
    p_delivery_info jsonb,     -- JSON object
    p_payment_method text,
    p_promo_code text DEFAULT NULL,
    p_points_used int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (admin) to adjust stock/points
AS $$
DECLARE
    v_user_id uuid;
    v_total_price numeric := 0;
    v_subtotal numeric := 0;
    v_discount_amount numeric := 0;
    v_delivery_price numeric := 0;
    v_item jsonb;
    v_product_price numeric;
    v_variant_id uuid;
    v_current_stock int;
    v_new_stock int;
    v_promo_record record;
    v_user_points int;
    v_new_order_id uuid;
    v_config_vip_threshold int;
    v_user_total_spent numeric;
    v_is_vip boolean := false;
BEGIN
    -- 1. Get User ID
    v_user_id := auth.uid();
    
    -- 2. Validate Items & Calculate Subtotal (Using Server Prices)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Get Product Price
        SELECT price INTO v_product_price FROM public.products WHERE id = (v_item->>'id')::uuid;
        IF v_product_price IS NULL THEN
            RAISE EXCEPTION 'Product not found: %', v_item->>'id';
        END IF;

        v_subtotal := v_subtotal + (v_product_price * (v_item->>'quantity')::int);

        -- Check and Deduct Stock
        SELECT id, stock INTO v_variant_id, v_current_stock 
        FROM public.product_variants 
        WHERE product_id = (v_item->>'id')::uuid AND size = (v_item->>'selectedSize');
        
        IF v_variant_id IS NULL THEN
             -- Fallback if no variant row exists (should not happen if data integrity is kept)
             RAISE EXCEPTION 'Variant not found: % %', v_item->>'name', v_item->>'selectedSize';
        END IF;

        IF v_current_stock < (v_item->>'quantity')::int THEN
            RAISE EXCEPTION 'Insufficient stock for % (Size: %)', v_item->>'name', v_item->>'selectedSize';
        END IF;

        -- Update Stock
        UPDATE public.product_variants 
        SET stock = stock - (v_item->>'quantity')::int
        WHERE id = v_variant_id;
        
        -- Log Inventory Move
        INSERT INTO public.inventory_logs (product_id, variant_size, change_amount, reason, user_id)
        VALUES ((v_item->>'id')::uuid, v_item->>'selectedSize', -(v_item->>'quantity')::int, 'new_order', v_user_id);
    END LOOP;

    -- 3. Calculate Delivery
    IF (p_delivery_info->>'deliveryMethod') = 'cdek_door' THEN
        v_delivery_price := 550;
    ELSE
        v_delivery_price := 350;
    END IF;

    -- 4. Apply Promo Code
    IF p_promo_code IS NOT NULL AND length(p_promo_code) > 0 THEN
        SELECT * INTO v_promo_record FROM public.promocodes WHERE code = upper(p_promo_code);
        
        IF v_promo_record.id IS NOT NULL AND v_promo_record.is_active THEN
            -- Check Limits
            IF v_promo_record.usage_limit IS NOT NULL AND v_promo_record.usage_count >= v_promo_record.usage_limit THEN
                RAISE EXCEPTION 'Promo code usage limit reached';
            END IF;
            IF v_promo_record.min_order_amount > 0 AND v_subtotal < v_promo_record.min_order_amount THEN
                RAISE EXCEPTION 'Order amount too low for this promo code';
            END IF;
            
            -- Check Target Audience (VIP)
            IF v_promo_record.target_audience = 'vip_only' THEN
                 SELECT vip_threshold INTO v_config_vip_threshold FROM public.site_config LIMIT 1;
                 SELECT COALESCE(SUM(total_price) FILTER (WHERE status != 'cancelled'), 0) INTO v_user_total_spent 
                 FROM public.orders WHERE user_id = v_user_id;
                 
                 IF v_user_total_spent < COALESCE(v_config_vip_threshold, 15000) THEN
                    RAISE EXCEPTION 'Promo code is for VIP only';
                 END IF;
            END IF;

            -- Calculate Discount
            IF v_promo_record.discount_type = 'fixed' THEN
                v_discount_amount := v_promo_record.discount_value;
            ELSE
                v_discount_amount := round(v_subtotal * (v_promo_record.discount_value / 100.0));
            END IF;
            
            -- Update Promo Usage
            UPDATE public.promocodes SET usage_count = usage_count + 1 WHERE id = v_promo_record.id;
        END IF;
    END IF;

    -- Cap discount
    IF v_discount_amount > v_subtotal THEN
        v_discount_amount := v_subtotal;
    END IF;

    -- 5. Apply Loyalty Points
    IF p_points_used > 0 THEN
        SELECT loyalty_points INTO v_user_points FROM public.profiles WHERE id = v_user_id;
        IF v_user_points < p_points_used THEN
            RAISE EXCEPTION 'Not enough points';
        END IF;
        
        -- Cap points usage (e.g. max 50% of total after discount)
        IF p_points_used > ((v_subtotal - v_discount_amount) * 0.5) THEN
             RAISE EXCEPTION 'Cannot pay more than 50%% with points';
        END IF;

        UPDATE public.profiles SET loyalty_points = loyalty_points - p_points_used WHERE id = v_user_id;
    END IF;

    -- 6. Final Total
    v_total_price := (v_subtotal - v_discount_amount) + v_delivery_price - p_points_used;
    IF v_total_price < 0 THEN v_total_price := 0; END IF;

    -- 7. Insert Order
    INSERT INTO public.orders (
        user_id,
        status,
        total_price,
        subtotal,
        points_used,
        payment_method,
        customer_info,
        order_items
    ) VALUES (
        v_user_id,
        'new',
        v_total_price,
        v_subtotal,
        p_points_used,
        p_payment_method,
        p_delivery_info || jsonb_build_object('discountAmount', v_discount_amount, 'promoCode', p_promo_code),
        p_items
    ) RETURNING id INTO v_new_order_id;

    -- 8. Clear User Cart
    UPDATE public.profiles SET current_cart = '[]'::jsonb WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'order_id', v_new_order_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. DYNAMIC VIEW UPDATE
DROP VIEW IF EXISTS public.customer_segments;
CREATE OR REPLACE VIEW public.customer_segments WITH (security_invoker=false) AS
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
        -- Dynamic VIP Threshold from Site Config
        WHEN COALESCE(SUM(o.total_price) FILTER (WHERE o.status != 'cancelled'), 0) >= (SELECT vip_threshold FROM public.site_config LIMIT 1) THEN 'whale'
        WHEN COUNT(o.id) FILTER (WHERE o.status != 'cancelled' AND o.created_at > (now() - interval '30 days')) > 2 THEN 'hot'
        WHEN MAX(o.created_at) < (now() - interval '90 days') THEN 'churn'
        WHEN MAX(o.created_at) IS NULL AND p.created_at > (now() - interval '30 days') THEN 'new'
        ELSE 'regular'
    END as segment
FROM public.profiles p
LEFT JOIN public.orders o ON p.id = o.user_id
GROUP BY p.id;

GRANT SELECT ON public.customer_segments TO authenticated;
