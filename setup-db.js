import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: "postgresql://postgres.bzpotcqlatuqaakgjizw:qEuPtf%40E8%24FH8Hj@aws-1-ap-south-1.pooler.supabase.com:5432/postgres" });

async function setup() {
    await client.connect();
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

        -- Create policies
        CREATE POLICY "Users can manage their own subscriptions"
            ON push_subscriptions FOR ALL
            USING (auth.uid() = user_id);
    `).catch(e => {
        // Ignore "already exists" error for policies
        console.log(e.message);
    });
    console.log("Database setup complete.");
    await client.end();
}
setup();
