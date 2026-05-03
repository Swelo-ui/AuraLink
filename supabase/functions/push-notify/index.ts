// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || 'BBcAPfz9xbm2SBMdQjNpSMEOchSFoVeF2cQ9sXDDaguCcmV3uiR5Z9CPC7UfC3W_f41XnR1h35z_XtyPUwyecYM';
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || 'WBxAFwSbWrENzj30e1wcUNnWOvYiLnL82QgE-DVD-Wc';

webpush.setVapidDetails(
  "mailto:admin@auralink.app",
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Webhook payload:", payload);
    
    // Check if it's a message insert
    if (payload.table === 'messages' && payload.type === 'INSERT') {
      const msg = payload.record;
      // Fetch receiver subscriptions
      const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', msg.receiver_id);
      if (!subs || subs.length === 0) return new Response("No subscriptions", { status: 200 });

      // Fetch sender details
      const { data: sender } = await supabase.from('users').select('username').eq('id', msg.sender_id).single();
      const username = sender?.username || 'Someone';

      let text = msg.content;
      if (msg.type === 'file') text = 'Sent a file 📎';

      // Find chat URL
      const { data: conn } = await supabase.from('connections')
        .select('id')
        .or(`and(user1_id.eq.${msg.receiver_id},user2_id.eq.${msg.sender_id}),and(user1_id.eq.${msg.sender_id},user2_id.eq.${msg.receiver_id})`)
        .single();
      const chatUrl = conn ? `/dashboard/c/${conn.id}` : '/dashboard';

      const pushData = JSON.stringify({
        title: `New message from ${username}`,
        body: text,
        url: chatUrl
      });

      // Send to all subscriptions for this user
      const promises = subs.map(sub => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh
          }
        };
        return webpush.sendNotification(pushSubscription, pushData).catch(async (err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
             // Subscription expired or no longer valid
             await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        });
      });

      await Promise.all(promises);
      return new Response("Notifications sent", { status: 200 });
    }

    // Check if it's a new connection insert
    if (payload.table === 'connections' && payload.type === 'INSERT') {
      const conn = payload.record;
      if (conn.status !== 'pending') return new Response("Ignored", { status: 200 });

      const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', conn.user2_id);
      if (!subs || subs.length === 0) return new Response("No subscriptions", { status: 200 });

      const { data: sender } = await supabase.from('users').select('username').eq('id', conn.user1_id).single();
      const username = sender?.username || 'Someone';

      const pushData = JSON.stringify({
        title: `New Friend Request`,
        body: `${username} wants to connect with you!`,
        url: '/dashboard'
      });

      const promises = subs.map(sub => {
        const pushSubscription = { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } };
        return webpush.sendNotification(pushSubscription, pushData).catch(async (err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
             await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        });
      });
      await Promise.all(promises);
      return new Response("Notifications sent", { status: 200 });
    }

    return new Response("Ignored payload", { status: 200 });
  } catch (error: any) {
    console.error("Error sending push:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
