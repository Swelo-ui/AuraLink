import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { playReceiveSound } from '../lib/audio';

export default function GlobalNotificationListener() {
  const { user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!user?.id) return;

    const showPushNotification = async (title: string, body: string, url: string) => {
      if (localStorage.getItem('aura_notifications') === 'false') return;
      if (Notification.permission !== 'granted') return;

      try {
        const registration = await navigator.serviceWorker?.ready;
        if (registration) {
          registration.showNotification(title, {
            body,
            icon: '/auralink-icon.jpeg',
            badge: '/auralink-icon.jpeg',
            data: { url }
          });
        } else {
          const n = new Notification(title, {
            body,
            icon: '/auralink-icon.jpeg',
          });
          n.onclick = () => {
            window.focus();
            window.location.href = url;
          };
        }
      } catch (err) {
        console.error('Push notification error', err);
      }
    };

    // Listen to all incoming messages globally
    const msgSub = supabase.channel('global_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, async (payload) => {
        const msg = payload.new as any;
        
        // Find which connection this message belongs to
        const { data: conn } = await supabase.from('connections')
          .select('id, user1_id, user2_id')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${msg.sender_id}),and(user1_id.eq.${msg.sender_id},user2_id.eq.${user.id})`)
          .single();

        const chatUrl = conn ? `/dashboard/c/${conn.id}` : '/dashboard';

        // Do not notify if user is currently looking at this exact chat and window is focused
        const isLookingAtChat = location.pathname === chatUrl;
        if (isLookingAtChat && document.hasFocus()) {
          return;
        }

        // Fetch sender details
        const { data: sender } = await supabase.from('users').select('username').eq('id', msg.sender_id).single();
        const username = sender?.username || 'Someone';

        let text = msg.content;
        if (msg.type === 'file') text = 'Sent a file 📎';

        showPushNotification(`New message from ${username}`, text, chatUrl);
        
        // Play sound if not in the chat (if in the chat, ChatWorkspace handles the sound)
        if (!isLookingAtChat && localStorage.getItem('aura_chat_settings') !== 'false') {
             const settings = JSON.parse(localStorage.getItem('aura_chat_settings') || '{}');
             if (settings.receiveSound !== false) {
                 playReceiveSound();
             }
        }
      })
      .subscribe();

    // Listen to new connection requests
    const connSub = supabase.channel('global_connections')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connections', filter: `user2_id=eq.${user.id}` }, async (payload) => {
        const conn = payload.new as any;
        if (conn.status !== 'pending') return;

        const { data: sender } = await supabase.from('users').select('username').eq('id', conn.user1_id).single();
        const username = sender?.username || 'Someone';

        showPushNotification(`New Friend Request`, `${username} wants to connect with you on AuraLink!`, '/dashboard');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgSub);
      supabase.removeChannel(connSub);
    };
  }, [user?.id, location.pathname]);

  return null;
}
