import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required.');
    console.error('Set it in your .env file: DATABASE_URL="postgresql://..."');
    process.exit(1);
}

const client = new Client({ connectionString });

async function setup() {
    await client.connect();
    console.log('Connected to database.');

    await client.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      auth TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );

    -- Enable RLS
    ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

    -- Create policies (idempotent with IF NOT EXISTS pattern)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own subscriptions'
      ) THEN
        CREATE POLICY "Users can manage their own subscriptions"
          ON push_subscriptions FOR ALL
          USING (auth.uid() = user_id);
      END IF;
    END $$;
  `).catch(e => {
        console.log('Note:', e.message);
    });

    console.log('Database setup complete.');
    await client.end();
}

setup().catch(err => {
    console.error('Setup failed:', err);
    process.exit(1);
});
