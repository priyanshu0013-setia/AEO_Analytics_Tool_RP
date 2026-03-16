import pg from "pg";

export async function runMigrations(databaseUrl: string) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        target_url  TEXT NOT NULL,
        competitor_urls JSON NOT NULL DEFAULT '[]',
        seed_queries    JSON NOT NULL DEFAULT '[]',
        status      TEXT NOT NULL DEFAULT 'idle',
        created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS llm_responses (
        id           SERIAL PRIMARY KEY,
        campaign_id  INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        llm          TEXT NOT NULL,
        query        TEXT NOT NULL,
        response_text TEXT NOT NULL,
        created_at   TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Database migrations complete.");
  } finally {
    await client.end();
  }
}
