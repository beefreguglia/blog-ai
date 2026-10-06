import { readFile } from "node:fs/promises";
import pg from "pg";
import { pool } from "../../src/db/pool.js";
import { TEST_DATABASE_URL } from "./setup.js";

const migrationPath = new URL("../../src/db/migrations/001.do.create-posts.sql", import.meta.url);

// Cria o banco de testes (se necessário) e aplica a migration.
// Requer o PostgreSQL local no ar (pnpm run infra:up).
export async function prepareTestDatabase() {
  const url = new URL(TEST_DATABASE_URL);
  const database = url.pathname.slice(1);

  url.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: url.toString() });

  await admin.connect();

  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      database,
    ]);

    if (!rowCount) {
      await admin.query(`CREATE DATABASE "${database}"`);
    }
  } finally {
    await admin.end();
  }

  await pool.query(await readFile(migrationPath, "utf8"));
}

export async function resetPosts() {
  await pool.query("TRUNCATE posts");
}

export async function insertPost({
  id,
  title = "Título",
  content = "Conteúdo",
  publishedAt = null,
  approvedAt = null,
  rejectedAt = null,
}) {
  const { rows } = await pool.query(
    `INSERT INTO posts (id, title, content, published_at, approved_at, rejected_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, title, content, publishedAt, approvedAt, rejectedAt],
  );

  return rows[0];
}

export function closePool() {
  return pool.end();
}
