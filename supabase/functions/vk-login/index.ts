
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirect_uri } = await req.json()
    
    // Retrieve secrets
    const CLIENT_ID = Deno.env.get('VK_CLIENT_ID')
    const CLIENT_SECRET = Deno.env.get('VK_CLIENT_SECRET')
    const SITE_URL = Deno.env.get('SITE_URL')

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('VK Credentials not set in Supabase Secrets')
    }

    // 1. Exchange Code for Access Token
    const tokenUrl = `https://oauth.vk.com/access_token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&redirect_uri=${redirect_uri}&code=${code}`
    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error('VK Token Error:', tokenData)
      throw new Error(tokenData.error_description || 'VK Token Exchange Failed')
    }

    // 2. Get User Details
    const userUrl = `https://api.vk.com/method/users.get?user_ids=${tokenData.user_id}&fields=photo_400_orig&access_token=${tokenData.access_token}&v=5.131`
    const userRes = await fetch(userUrl)
    const userData = await userRes.json()
    
    if (userData.error) throw new Error('Failed to fetch VK user data')

    const vkUser = userData.response[0]
    const fullName = `${vkUser.first_name} ${vkUser.last_name}`.trim()
    // Use VK email if granted, otherwise generate a unique technical email
    const email = tokenData.email || `vk_${tokenData.user_id}@vk.printproject`

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let userId = null;

    // 3. Try to Create User
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { 
          full_name: fullName, 
          avatar_url: vkUser.photo_400_orig, 
          vk_id: tokenData.user_id,
          provider: 'vk'
      }
    })

    if (!createError && createdUser.user) {
       userId = createdUser.user.id;
    } else if (createError?.message?.includes('already registered') || createError?.message?.includes('already exists') || createError?.status === 422) {
       // 4. If user exists, find their ID
       // First try finding in profiles (fastest)
       const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
       
       if (profile) {
         userId = profile.id;
       } else {
         // Fallback: search in auth users list (slower but reliable if profile missing)
         const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
         const foundUser = listData.users.find((u: any) => u.email === email);
         if (foundUser) {
            userId = foundUser.id;
         } else {
            throw new Error('User exists but cannot be found. Contact support.');
         }
       }

       // Update metadata for existing user
       if (userId) {
         await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { 
                full_name: fullName, 
                avatar_url: vkUser.photo_400_orig, 
                vk_id: tokenData.user_id,
                provider: 'vk'
            }
         });
       }
    } else {
       // Real creation error
       throw createError;
    }

    if (!userId) {
        throw new Error('Failed to resolve User ID');
    }

    // 5. Upsert Public Profile
    await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: email,
        full_name: fullName,
        avatar_url: vkUser.photo_400_orig
    })

    // 6. Generate Magic Link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: { redirectTo: `${SITE_URL}/profile` }
    })

    if (linkError) throw linkError

    // Return the login URL
    return new Response(JSON.stringify({ url: linkData.properties.action_link }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("VK Login Function Error:", error)
    return new Response(JSON.stringify({ error: error.message || 'Unknown Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
