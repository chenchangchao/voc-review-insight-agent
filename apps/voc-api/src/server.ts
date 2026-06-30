import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { pool, closePool } from "./db";

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

function toInt(value: unknown, fallback: number, min = 1, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

app.get("/", async () => {
  return {
    name: "VOC Review Insight API",
    status: "ok",
    endpoints: [
      "GET /health",
      "GET /metrics",
      "GET /clusters",
      "GET /clusters/:clusterKey",
      "GET /clusters/:clusterKey/reviews",
      "GET /reviews/:reviewId/similar"
    ]
  };
});

app.get("/health", async () => {
  const result = await pool.query("SELECT now() AS now");
  return {
    status: "ok",
    db_time: result.rows[0].now
  };
});

app.get("/metrics", async () => {
  const sql = `
    WITH review_counts AS (
      SELECT
        COUNT(*)::int AS total_reviews,
        COUNT(*) FILTER (
          WHERE product_line IN ('dash_cam', 'video_doorbell', 'ipc')
        )::int AS core_reviews,
        COUNT(*) FILTER (
          WHERE product_line IN ('dash_cam', 'video_doorbell', 'ipc')
            AND last_star BETWEEN 1 AND 3
        )::int AS core_negative_reviews
      FROM voc_reviews
    ),
    embedding_counts AS (
      SELECT COUNT(*)::int AS embedded_reviews
      FROM voc_review_embeddings
    ),
    cluster_counts AS (
      SELECT
        COUNT(*)::int AS issue_clusters,
        COUNT(*) FILTER (WHERE severity >= 4)::int AS high_severity_clusters
      FROM voc_issue_clusters
    )
    SELECT *
    FROM review_counts, embedding_counts, cluster_counts;
  `;

  const result = await pool.query(sql);
  return result.rows[0];
});

app.get("/clusters", async (request) => {
  const querySchema = z.object({
    product_line: z.string().optional(),
    issue_category: z.string().optional(),
    min_severity: z.coerce.number().int().min(1).max(5).optional()
  });

  const query = querySchema.parse(request.query);

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (query.product_line) {
    values.push(query.product_line);
    conditions.push(`product_line = $${values.length}`);
  }

  if (query.issue_category) {
    values.push(query.issue_category);
    conditions.push(`issue_category = $${values.length}`);
  }

  if (query.min_severity) {
    values.push(query.min_severity);
    conditions.push(`severity >= $${values.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      cluster_id,
      cluster_key,
      product_line,
      issue_category,
      cluster_name_en,
      cluster_name_zh,
      severity,
      representative_review_id,
      linked_reviews,
      avg_similarity,
      min_similarity,
      max_similarity,
      first_review_date,
      last_review_date,
      summary_zh,
      suggestion
    FROM v_voc_issue_cluster_summary
    ${where}
    ORDER BY product_line, severity DESC, linked_reviews DESC, cluster_key;
  `;

  const result = await pool.query(sql, values);
  return {
    count: result.rowCount,
    data: result.rows
  };
});

app.get("/clusters/:clusterKey", async (request, reply) => {
  const paramsSchema = z.object({
    clusterKey: z.string().min(1)
  });

  const { clusterKey } = paramsSchema.parse(request.params);

  const result = await pool.query(
    `
    SELECT
      cluster_id,
      cluster_key,
      product_line,
      issue_category,
      cluster_name_en,
      cluster_name_zh,
      severity,
      representative_review_id,
      linked_reviews,
      avg_similarity,
      min_similarity,
      max_similarity,
      first_review_date,
      last_review_date,
      summary_zh,
      suggestion
    FROM v_voc_issue_cluster_summary
    WHERE cluster_key = $1;
    `,
    [clusterKey]
  );

  if (result.rowCount === 0) {
    return reply.code(404).send({
      error: "cluster_not_found",
      message: `Cluster not found: ${clusterKey}`
    });
  }

  return result.rows[0];
});

app.get("/clusters/:clusterKey/reviews", async (request, reply) => {
  const paramsSchema = z.object({
    clusterKey: z.string().min(1)
  });

  const { clusterKey } = paramsSchema.parse(request.params);
  const limit = toInt((request.query as any)?.limit, 20, 1, 100);

  const result = await pool.query(
    `
    SELECT
      cluster_key,
      cluster_name_zh,
      issue_category,
      severity,
      review_id,
      similarity,
      marketplace,
      last_star,
      review_date,
      last_title,
      content_clean
    FROM v_voc_issue_cluster_detail
    WHERE cluster_key = $1
    ORDER BY similarity DESC
    LIMIT $2;
    `,
    [clusterKey, limit]
  );

  if (result.rowCount === 0) {
    return reply.code(404).send({
      error: "cluster_reviews_not_found",
      message: `No reviews found for cluster: ${clusterKey}`
    });
  }

  return {
    cluster_key: clusterKey,
    count: result.rowCount,
    data: result.rows
  };
});

app.get("/reviews/:reviewId/similar", async (request) => {
  const paramsSchema = z.object({
    reviewId: z.coerce.number().int().positive()
  });

  const { reviewId } = paramsSchema.parse(request.params);
  const limit = toInt((request.query as any)?.limit, 10, 1, 50);

  const result = await pool.query(
    `
    SELECT *
    FROM find_similar_reviews($1, $2);
    `,
    [reviewId, limit]
  );

  return {
    review_id: reviewId,
    count: result.rowCount,
    data: result.rows
  };
});

app.get("/reviews/:reviewId", async (request, reply) => {
  const paramsSchema = z.object({
    reviewId: z.coerce.number().int().positive()
  });

  const { reviewId } = paramsSchema.parse(request.params);

  const result = await pool.query(
    `
    SELECT
      id,
      marketplace,
      product_line,
      last_star,
      review_date,
      last_title,
      content_clean,
      item_name
    FROM voc_reviews
    WHERE id = $1;
    `,
    [reviewId]
  );

  if (result.rowCount === 0) {
    return reply.code(404).send({
      error: "review_not_found",
      message: `Review not found: ${reviewId}`
    });
  }

  return result.rows[0];
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);

  if (error instanceof z.ZodError) {
    return reply.code(400).send({
      error: "bad_request",
      issues: error.issues
    });
  }

  return reply.code(500).send({
    error: "internal_server_error",
    message: error.message
  });
});

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`VOC API listening on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  await closePool();
  process.exit(1);
}

process.on("SIGINT", async () => {
  await closePool();
  await app.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closePool();
  await app.close();
  process.exit(0);
});
