import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required.');
    console.error('Set it in your .env file: DATABASE_URL="postgresql://..."');
    process.exit(1);
}

const edgeFunctionUrl = process.env.EDGE_FUNCTION_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!edgeFunctionUrl || !anonKey) {
    console.error('ERROR: EDGE_FUNCTION_URL and VITE_SUPABASE_ANON_KEY are required.');
    process.exit(1);
}

const client = new Client({ connectionString });

async function setup() {
    await client.connect();
    console.log('Connected to database.');

    await client.query(`
    -- Enable pg_net extension
    CREATE EXTENSION IF NOT EXISTS pg_net;

    -- Create trigger function
    CREATE OR REPLACE FUNCTION trigger_push_notification()
    RETURNS TRIGGER AS $$
    BEGIN
      PERFORM net.http_post(
        url := '${edgeFunctionUrl}',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ${anonKey}'
        ),
        body := jsonb_build_object(
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'record', row_to_json(NEW)
        )
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS messages_push_notify ON messages;
    DROP TRIGGER IF EXISTS connections_push_notify ON connections;

    -- Create triggers
    CREATE TRIGGER messages_push_notify
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION trigger_push_notification();

    CREATE TRIGGER connections_push_notify
    AFTER INSERT ON connections
    FOR EACH ROW EXECUTE FUNCTION trigger_push_notification();
  `).catch(e => {
        console.log('Note:', e.message);
    });

    console.log('Webhook triggers setup complete.');
    await client.end();
}

setup().catch(err => {
    console.error('Setup failed:', err);
    process.exit(1);
});
