
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

    // 3. Find or Create User (Safe Method)
    // We fetch the list of users to check if this email already exists
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
    let user = listData.users.find((u: any) => u.email === email)

    if (!user) {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { 
            full_name: fullName, 
            avatar_url: vkUser.photo_400_orig, 
            vk_id: tokenData.user_id,
            provider: 'vk'
        }
      })
      if (createError) throw createError
      user = newUser.user
    } else {
      // Update existing user metadata
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { 
            full_name: fullName, 
            avatar_url: vkUser.photo_400_orig, 
            vk_id: tokenData.user_id,
            provider: 'vk'
        }
      })
    }

    // 4. Upsert Public Profile (Ensure data is visible to frontend)
    if (user) {
        await supabaseAdmin.from('profiles').upsert({
            id: user.id,
            email: email,
            full_name: fullName,
            avatar_url: vkUser.photo_400_orig
        })
    }

    // 5. Generate Magic Link
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
