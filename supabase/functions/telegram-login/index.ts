
// Follow this setup guide to integrate the Deno runtime into your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts"
import { sha256 } from "https://deno.land/x/sha256@v1.0.2/mod.ts"

// Declare Deno global for environments where types are missing
declare const Deno: any;

console.log("Telegram Login Function Up!")

serve(async (req) => {
  // 1. CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // 2. Get Data from Request
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = await req.json()
    
    // FIX: Using the token directly as requested. 
    // Ideally, this should be Deno.env.get('BOT_TOKEN') with the token stored in Supabase Secrets.
    const botToken = '8430425198:AAEqn_O7CuZ57-pYkMGLN7fBJQo1mCEu-hE';

    if (!botToken) {
      throw new Error('Bot token is missing configuration')
    }

    // 3. Verify Telegram Hash (Security Check)
    // Telegram requires us to verify that the data actually came from them
    // We construct a data-check-string and HMAC-SHA256 it with the bot token
    const dataCheckArr = []
    if (auth_date) dataCheckArr.push(`auth_date=${auth_date}`)
    if (first_name) dataCheckArr.push(`first_name=${first_name}`)
    if (id) dataCheckArr.push(`id=${id}`)
    if (last_name) dataCheckArr.push(`last_name=${last_name}`)
    if (photo_url) dataCheckArr.push(`photo_url=${photo_url}`)
    if (username) dataCheckArr.push(`username=${username}`)
    
    // Sort alphabetically
    dataCheckArr.sort()
    const dataCheckString = dataCheckArr.join('\n')

    // Create Secret Key (SHA256 of bot token)
    const secretKey = new sha256().update(botToken).digest()
    
    // Calculate HMAC
    const calculatedHash = hmac(new TextEncoder().encode("sha256"), secretKey, new TextEncoder().encode(dataCheckString), "hex", "utf8")

    // Compare
    if (calculatedHash !== hash) {
      throw new Error('Invalid Telegram Hash. Data may be compromised.')
    }

    // 4. Initialize Admin Supabase Client
    // We need service_role key to bypass RLS and create users/sessions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 5. Find or Create User in Supabase Auth
    // Since TG doesn't give email, we generate a fake one: tg_{id}@telegram.printproject
    const email = `tg_${id}@telegram.printproject`
    
    // Check if user exists
    const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('telegram_id', id).single()

    let userId = existingUser?.id

    if (!userId) {
      // Create new user in Auth system
      // We use a random password because they will login via this function anyway
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { telegram_id: id, username: username, full_name: first_name }
      })

      if (createError) {
        // Handle case where user exists in Auth but not in Profiles (rare sync issue)
        if (createError.message.includes('already been registered')) {
           // Try to find by email
           const { data: userByEmail } = await supabaseAdmin.rpc('get_user_id_by_email', { email_input: email });
           // If we can't recover, throw
           if (!userByEmail) throw createError;
           userId = userByEmail; 
        } else {
           throw createError
        }
      } else {
         userId = newUser.user.id
      }
    }

    // 6. Update/Upsert Profile Data
    // We do this every login to keep avatar/username fresh
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: email,
      telegram_id: id,
      username: username || '',
      full_name: [first_name, last_name].filter(Boolean).join(' '),
      avatar_url: photo_url || '',
      role: 'user' // Default role
    })

    // 7. Create Session
    // We manually generate a session token for the client
    const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
        user_id: userId
    })

    if (sessionError) throw sessionError

    // 8. Return Session to Frontend
    return new Response(
      JSON.stringify({ session }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  }
})
