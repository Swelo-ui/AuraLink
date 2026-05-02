
import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres.bzpotcqlatuqaakgjizw:qEuPtf%40E8%24FH8Hj@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to database.");
    
    const queries = [
      "ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS telegram_file_id TEXT;",
      "ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS telegram_msg_id BIGINT;",
      "ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS file_size BIGINT;",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS telegram_file_id TEXT;",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS telegram_msg_id BIGINT;"
    ];

    for (const q of queries) {
      console.log(`Running: ${q}`);
      await client.query(q);
    }
    
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigration();
