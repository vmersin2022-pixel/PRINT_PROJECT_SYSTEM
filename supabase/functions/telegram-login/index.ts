// Follow this setup guide to integrate the Deno runtime into your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

const BOT_TOKEN = '8430425198:AAEqn_O7CuZ57-pYkMGLN7fBJQo1mCEu-hE';
const SITE_URL = 'https://print-project-system.vercel.app'; // Change if needed

console.log("Telegram Bot Webhook Handler Up!")

serve(async (req) => {
  try {
    const url = new URL(req.url);
    
    // Simple Webhook Handler
    // 1. Parse incoming update from Telegram
    if (req.method === 'POST') {
        const update = await req.json();
        
        if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            const from = update.message.from; // User info

            // Check for /start command
            if (text.startsWith('/start')) {
                
                // Initialize Supabase Admin
                const supabaseAdmin = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
                    { auth: { autoRefreshToken: false, persistSession: false } }
                );

                const email = `tg_${from.id}@telegram.printproject`;
                let userId;

                // 1. Check if user exists
                const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('telegram_id', from.id).single();
                
                if (existingUser) {
                    userId = existingUser.id;
                } else {
                    // Create new user
                    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                        email: email,
                        email_confirm: true,
                        user_metadata: { telegram_id: from.id, username: from.username, full_name: from.first_name }
                    });
                    
                    if (createError) {
                        // Recover if email exists but profile doesn't
                        const { data: userByEmail } = await supabaseAdmin.rpc('get_user_id_by_email', { email_input: email });
                        if (userByEmail) userId = userByEmail;
                        else throw createError;
                    } else {
                        userId = newUser.user.id;
                    }
                }

                // 2. Update Profile
                await supabaseAdmin.from('profiles').upsert({
                    id: userId,
                    email: email,
                    telegram_id: from.id,
                    username: from.username || '',
                    full_name: [from.first_name, from.last_name].filter(Boolean).join(' '),
                    avatar_url: '', 
                    role: 'user'
                });

                // 3. Generate Session Magic Link
                // Use generateLink to create a valid action link
                const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'magiclink',
                    email: email,
                    options: {
                        redirectTo: `${SITE_URL}/profile`
                    }
                });

                if (linkError) throw linkError;

                // 4. Send Message back to Telegram with the Link
                const magicLink = linkData.properties.action_link;
                
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `Привет, ${from.first_name}! 👋\n\nНажми на кнопку ниже, чтобы автоматически войти в личный кабинет PRINT PROJECT.`,
                        reply_markup: {
                            inline_keyboard: [[
                                { text: "🔓 ВОЙТИ В АККАУНТ", url: magicLink }
                            ]]
                        }
                    })
                });
            }
        }
    }

    return new Response('ok', { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 200 }); // Always 200 for Telegram
  }
})