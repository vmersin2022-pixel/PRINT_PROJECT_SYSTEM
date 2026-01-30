
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

// 1. Глобальные настройки (строго вверху)
const BOT_TOKEN = '8430425198:AAEqn_O7CuZ57-pYkMGLN7fBJQo1mCEu-hE';
const SITE_URL = 'https://print-project-system.vercel.app';

console.log("Smooth-responder bot function started!");

serve(async (req) => {
  // Обработка CORS (на случай вызова с сайта)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const update = await req.json();

    // Проверяем наличие сообщения и команды /start
    if (update.message?.text?.startsWith('/start')) {
      const from = update.message.from;
      const chatId = update.message.chat.id;

      // 2. Инициализация Supabase клиента
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Генерируем уникальный email на основе Telegram ID
      const email = `tg_${from.id}@telegram.printproject`;

      // 3. Получаем или создаем пользователя в Auth
      // Используем listUsers для поиска по email, так как это работает стабильнее
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;

      let user = usersData.users.find(u => u.email === email);

      if (!user) {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { 
            telegram_id: from.id, 
            full_name: `${from.first_name} ${from.last_name || ''}`.trim() 
          }
        });
        if (createError) throw createError;
        user = newUser.user;
      }

      // 4. Обновляем профиль в БД
      await supabase.from('profiles').upsert({
        id: user.id,
        telegram_id: from.id.toString(),
        email: email,
        full_name: `${from.first_name} ${from.last_name || ''}`.trim(),
        username: from.username || '',
        role: 'user'
      });

      // 5. Генерируем магическую ссылку для входа
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: { redirectTo: `${SITE_URL}/profile` }
      });

      if (linkError) throw linkError;

      const actionLink = linkData.properties.action_link;

      // 6. Отправляем красиво оформленное сообщение в Telegram
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `<b>PRINT PROJECT | ВХОД</b>\n\nЗдравствуйте, ${from.first_name}! 👋\n\nВы запросили авторизацию. Нажмите кнопку ниже, чтобы войти в личный кабинет.\n\n<i>Ссылка действительна 15 минут.</i>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔓 ВОЙТИ В АККАУНТ", url: actionLink }],
              [{ text: "📦 Мои заказы", url: `${SITE_URL}/profile` }]
            ]
          }
        })
      });
    }

    return new Response(JSON.stringify({ ok: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 200, // Возвращаем 200, чтобы Telegram не повторял запросы при ошибках кода
      headers: { 'Content-Type': 'application/json' } 
    });
  }
})
