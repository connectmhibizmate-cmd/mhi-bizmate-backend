import pg from 'pg';
const { Client } = pg;
export async function runMigrations() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) return;
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(`CREATE TABLE IF NOT EXISTS support_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, message TEXT NOT NULL, is_admin BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW());`);
  } finally {
    await client.end();
  }
}
