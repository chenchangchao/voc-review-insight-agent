import pg from "pg";

const { Pool, types } = pg;

/**
 * pg 默认把 int8 / numeric 当字符串返回。
 * 这里为了 API 前端使用方便，将：
 * - int8 转 number
 * - numeric 转 number
 *
 * 当前项目 review_id / cluster_id / count / similarity 都在安全范围内。
 */
types.setTypeParser(20, (value) => Number(value)); // int8 / bigint
types.setTypeParser(1700, (value) => Number(value)); // numeric

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export async function closePool() {
  await pool.end();
}
