import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const client = new Client({ connectionString: "postgresql://postgres.bzpotcqlatuqaakgjizw:qEuPtf%40E8%24FH8Hj@aws-1-ap-south-1.pooler.supabase.com:5432/postgres" });

async function setup() {
    await client.connect();

    const edgeFunctionUrl = "https://bzpotcqlatuqaakgjizw.supabase.co/functions/v1/push-notify";
    const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cG90Y3FsYXR1cWFha2dqaXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTQzMjcsImV4cCI6MjA5MzIzMDMyN30.MFTQAwYCGxZaMq_KU3Dkgyh2c0Aq5aCpEHf4QWQ9lSI";

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
        console.log("Error in triggers:", e.message);
    });

    console.log("Webhook triggers setup complete.");
    await client.end();
}
setup();
