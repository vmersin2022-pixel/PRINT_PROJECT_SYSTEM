
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

console.log("VK Login Function Started");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const { code, redirect_uri } = await req.json();

    if (!code || !redirect_uri) {
      throw new Error('Missing code or redirect_uri');
    }

    const clientId = Deno.env.get('VK_CLIENT_ID');
    const clientSecret = Deno.env.get('VK_CLIENT_SECRET');
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000';

    if (!clientId || !clientSecret) {
      throw new Error('VK Credentials not configured on server');
    }

    // 1. Exchange Code for Access Token
    const tokenResponse = await fetch(`https://oauth.vk.com/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirect_uri}&code=${code}`);
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('VK Token Error:', tokenData.error);
      throw new Error(tokenData.error_description || 'Failed to exchange code');
    }

    const { access_token, user_id, email: vkEmail } = tokenData;

    // 2. Get User Details (Name, Photo)
    // We need this because access_token response might not have name
    const userResponse = await fetch(`https://api.vk.com/method/users.get?user_ids=${user_id}&fields=photo_400_orig&access_token=${access_token}&v=5.131`);
    const userData = await userResponse.json();
    
    if (userData.error) {
       console.error('VK User Error:', userData.error);
       throw new Error('Failed to fetch user data');
    }

    const vkUser = userData.response[0];
    const fullName = `${vkUser.first_name} ${vkUser.last_name}`.trim();
    const avatarUrl = vkUser.photo_400_orig;

    // 3. Init Supabase Admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 4. Determine Email (Use real if given, else generate dummy)
    // Using a dummy email allows login even if user didn't share email permission
    const email = vkEmail || `vk_${user_id}@vk.printproject`;

    // 5. Find or Create User
    // We use listUsers to check existence safely
    const { data: usersData } = await supabase.auth.admin.listUsers();
    let user = usersData.users.find(u => u.email === email);

    if (!user) {
        // Check if maybe we have a user with this VK ID in metadata but different email?
        // For simplicity, we stick to the email strategy.
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: {
                vk_id: user_id,
                full_name: fullName,
                avatar_url: avatarUrl
            }
        });
        if (createError) throw createError;
        user = newUser.user;
    }

    // 6. Update Profile (Upsert)
    // Ensure the public profile table has the latest info
    await supabase.from('profiles').upsert({
        id: user.id,
        email: email,
        full_name: fullName,
        avatar_url: avatarUrl,
        // We can store vk_id if you add a column, or just rely on metadata
    });

    // 7. Generate Magic Link
    // This allows us to log the user in on the client side instantly
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: { redirectTo: `${siteUrl}/profile` }
    });

    if (linkError) throw linkError;

    // Return the action link (The URL that logs the user in)
    return new Response(JSON.stringify({ url: linkData.properties.action_link }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("VK Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
})
