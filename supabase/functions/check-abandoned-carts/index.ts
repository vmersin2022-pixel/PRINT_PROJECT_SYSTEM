
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

const BOT_TOKEN = '8430425198:AAEqn_O7CuZ57-pYkMGLN7fBJQo1mCEu-hE';
const SITE_URL = 'https://print-project-system.vercel.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    // 1. Init Supabase (Service Role to bypass RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Define Time Windows
    // We look for carts updated between 1 hour ago and 24 hours ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 3. Query "Abandoned" Profiles
    // Conditions:
    // - cart_updated_at is in the window
    // - current_cart is not null and not empty
    // - last_abandoned_notification is NULL OR older than 24 hours (to avoid spam)
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, telegram_id, full_name, current_cart, cart_updated_at')
      .neq('current_cart', null)
      .lt('cart_updated_at', oneHourAgo)
      .gt('cart_updated_at', twentyFourHoursAgo)
      .not('telegram_id', 'is', null);

    if (error) throw error;

    let processedCount = 0;

    // 4. Process each user
    for (const user of users) {
        // Double check array length in JS just in case
        if (!Array.isArray(user.current_cart) || user.current_cart.length === 0) continue;

        // Check if we already notified them recently (Double safety check)
        const { data: profileCheck } = await supabase
            .from('profiles')
            .select('last_abandoned_notification')
            .eq('id', user.id)
            .single();
        
        if (profileCheck?.last_abandoned_notification) {
            const lastNotified = new Date(profileCheck.last_abandoned_notification).getTime();
            const now = Date.now();
            if ((now - lastNotified) < 24 * 60 * 60 * 1000) {
                console.log(`Skipping user ${user.id}, notified recently.`);
                continue;
            }
        }

        // 5. Construct Message
        const items = user.current_cart as any[];
        const firstItem = items[0];
        const otherCount = items.length - 1;
        const itemName = firstItem.name || 'Товар';
        
        let messageText = `👋 <b>${user.full_name || 'Привет'}!</b>\n\n`;
        messageText += `Кажется, вы забыли завершить заказ. В корзине осталась: <b>${itemName}</b>`;
        if (otherCount > 0) messageText += ` и еще ${otherCount} поз.`;
        messageText += `\n\nРазмеры забронированы на ограниченное время.`;

        // 6. Send to Telegram
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: user.telegram_id,
                text: messageText,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🚀 ОФОРМИТЬ ЗАКАЗ", url: `${SITE_URL}/checkout` }] // Or /cart
                    ]
                }
            })
        });

        if (res.ok) {
            // 7. Update Last Notification Timestamp
            await supabase.from('profiles').update({
                last_abandoned_notification: new Date().toISOString()
            }).eq('id', user.id);
            
            processedCount++;
        }
    }

    return new Response(JSON.stringify({ success: true, processed: processedCount }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Cron Job Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
})