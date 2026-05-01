-- Create tables matching the Prisma schema, but optimized for Supabase

-- 1. Users (Public Profile)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 2. Connections
CREATE TABLE public.connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- "pending", "accepted"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- 3. Messages
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text', -- "text", "file"
  file_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Notes
CREATE TABLE public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  last_edited_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. Timetables
CREATE TABLE public.timetables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES public.connections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'todo' -- "todo", "in_progress", "done"
);

-- 6. Vault Items
CREATE TABLE public.vault_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL, -- "password", "file", "secret"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_vault_items_updated_at BEFORE UPDATE ON public.vault_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Setup RLS (Row Level Security)

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Connections policies
CREATE POLICY "Users can view their connections" ON public.connections FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can insert their connections" ON public.connections FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can update their connections" ON public.connections FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can delete their connections" ON public.connections FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages policies
CREATE POLICY "Users can view their messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert messages they send" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Notes policies
CREATE POLICY "Users can view their notes" ON public.notes FOR SELECT USING (
  user_id = auth.uid() OR 
  connection_id IN (SELECT id FROM public.connections WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);
CREATE POLICY "Users can insert their notes" ON public.notes FOR INSERT WITH CHECK (
  user_id = auth.uid() OR 
  connection_id IN (SELECT id FROM public.connections WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);
CREATE POLICY "Users can update their notes" ON public.notes FOR UPDATE USING (
  user_id = auth.uid() OR 
  connection_id IN (SELECT id FROM public.connections WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);
CREATE POLICY "Users can delete their notes" ON public.notes FOR DELETE USING (
  user_id = auth.uid() OR 
  connection_id IN (SELECT id FROM public.connections WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

-- Timetables policies
CREATE POLICY "Users can view their timetables" ON public.timetables FOR SELECT USING (
  user_id = auth.uid() OR 
  connection_id IN (SELECT id FROM public.connections WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);
CREATE POLICY "Users can insert their timetables" ON public.timetables FOR INSERT WITH CHECK (
  user_id = auth.uid() OR 
  connection_id IN (SELECT id FROM public.connections WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);
CREATE POLICY "Users can update their timetables" ON public.timetables FOR UPDATE USING (
  user_id = auth.uid() OR 
  connection_id IN (SELECT id FROM public.connections WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);
CREATE POLICY "Users can delete their timetables" ON public.timetables FOR DELETE USING (
  user_id = auth.uid() OR 
  connection_id IN (SELECT id FROM public.connections WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

-- Vault Items policies
CREATE POLICY "Users can view their own vault items" ON public.vault_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own vault items" ON public.vault_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vault items" ON public.vault_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vault items" ON public.vault_items FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timetables;
