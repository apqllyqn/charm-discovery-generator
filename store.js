// Deck storage. Uses Postgres when DATABASE_URL is set (Coolify prod),
// otherwise falls back to a JSON file on disk so local dev needs no database.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_PATH = path.join(__dirname, 'data', 'decks.json');
const usePg = Boolean(process.env.DATABASE_URL);

let pool = null;

export async function initStore() {
  if (usePg) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : false,
    });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS decks (
        slug        TEXT PRIMARY KEY,
        domain      TEXT NOT NULL,
        company     TEXT NOT NULL,
        data        JSONB NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    console.log('store: postgres');
  } else {
    await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
    try {
      await fs.access(FILE_PATH);
    } catch {
      await fs.writeFile(FILE_PATH, '{}');
    }
    console.log('store: file (' + FILE_PATH + ')');
  }
}

async function readFileStore() {
  try {
    return JSON.parse(await fs.readFile(FILE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

export async function saveDeck({ slug, domain, company, data }) {
  if (usePg) {
    await pool.query(
      `INSERT INTO decks (slug, domain, company, data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE
         SET domain = EXCLUDED.domain,
             company = EXCLUDED.company,
             data = EXCLUDED.data,
             created_at = now()`,
      [slug, domain, company, data]
    );
    return;
  }
  const all = await readFileStore();
  all[slug] = { slug, domain, company, data, created_at: new Date().toISOString() };
  await fs.writeFile(FILE_PATH, JSON.stringify(all, null, 2));
}

export async function getDeck(slug) {
  if (usePg) {
    const { rows } = await pool.query('SELECT * FROM decks WHERE slug = $1', [slug]);
    return rows[0] || null;
  }
  const all = await readFileStore();
  return all[slug] || null;
}

export async function listDecks(limit = 60) {
  if (usePg) {
    const { rows } = await pool.query(
      'SELECT slug, domain, company, created_at FROM decks ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return rows;
  }
  const all = await readFileStore();
  return Object.values(all)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit)
    .map(({ slug, domain, company, created_at }) => ({ slug, domain, company, created_at }));
}

export async function deleteDeck(slug) {
  if (usePg) {
    await pool.query('DELETE FROM decks WHERE slug = $1', [slug]);
    return;
  }
  const all = await readFileStore();
  delete all[slug];
  await fs.writeFile(FILE_PATH, JSON.stringify(all, null, 2));
}
