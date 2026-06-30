# VOC Review Insight API

基于 **Bun + TypeScript + Fastify + PostgreSQL 18 + pgvector + BGE-M3 Embedding** 构建的智能硬件 VOC 评论洞察 API。

本项目用于分析 Amazon / 海外智能硬件评论数据，将多语言负向评论向量化，基于 pgvector 做相似召回，并沉淀结构化 Issue Cluster，为后续 VOC 看板、Agent 问答、产品质量分析和竞品洞察提供数据服务。

---

## 1. 项目当前状态

已完成：

- PostgreSQL 18 + pgvector 数据底座
- Amazon Review 数据脱敏入库
- 核心产品线过滤：`dash_cam` / `video_doorbell` / `ipc`
- BGE-M3 多语言 embedding
- pgvector 相似评论检索
- 8 个高质量 VOC Issue Cluster
- Bun + TypeScript + Fastify API
- Nginx 反向代理公网访问

当前数据规模：

| 指标 | 数量 |
| --- | ---: |
| 原始 Review | 8756 |
| 核心产品线 Review | 7209 |
| 核心负向 Review | 1394 |
| 已向量化 Review | 1391 |
| Issue Cluster | 8 |
| 高严重度 Cluster | 5 |

## 2. 技术架构

```mermaid
flowchart TD
    A[Amazon Review 原始数据] --> B[脱敏清洗]
    B --> C[(PostgreSQL 18)]
    C --> D[核心产品线过滤]
    D --> E[负向评论 1-3星]
    E --> F[BGE-M3 多语言 Embedding]
    F --> G[(pgvector vector 1024)]
    G --> H[相似评论检索]
    H --> I[Issue Cluster 构建]
    I --> J[Fastify API]
    J --> K[Nginx 反向代理]
    K --> L[公网访问 / 前端看板 / Agent]
```

## 3. 核心能力

### 3.1 多语言 VOC 语义召回

系统能够跨语言召回相似问题，例如：

- 英语：memory card damaged
- 德语：设备短期失效
- 意大利语：启动后不稳定
- 西语：无法开机 / 无法使用

通过 BGE-M3 embedding + pgvector cosine similarity，避免单纯关键词匹配的局限。

### 3.2 Issue Cluster

当前沉淀 8 个高质量问题簇：

| 产品线 | Cluster Key | 问题簇 |
| --- | --- | --- |
| dash_cam | `dash_cam_power_reboot_failure` | 行车记录仪短期使用后重启、关机或无法启动 |
| dash_cam | `dash_cam_rear_camera_failure` | 行车记录仪后摄像头无法工作或无法连接 |
| dash_cam | `dash_cam_sd_card_storage_issue` | 行车记录仪 SD 卡、存储或格式化异常 |
| dash_cam | `dash_cam_video_quality_not_as_advertised` | 行车记录仪画质或 4K 宣传不符 |
| ipc | `ipc_camera_offline_or_hardware_failure` | IPC 摄像机停止工作、离线或无法重置 |
| video_doorbell | `video_doorbell_battery_power_issue` | 视频门铃电池续航短或耗电过快 |
| video_doorbell | `video_doorbell_connection_failure` | 视频门铃联网或配网失败 |
| video_doorbell | `video_doorbell_motion_detection_false_miss` | 视频门铃移动侦测误报、漏报或响应延迟 |

## 4. API 服务

### 4.1 本地启动

```bash
cd /opt/apps/agent-infra/voc-api

bun install
bun run dev
```

### 4.2 生产启动

```bash
bun src/server.ts
```

### 4.3 PM2 启动

```bash
pm2 start "bun src/server.ts" --name voc-api
pm2 save
pm2 list
```

## 5. API Endpoints

### 5.1 Health Check

```bash
curl http://127.0.0.1:8787/health
```

公网：

```bash
curl http://101.42.36.178/api/health
```

### 5.2 Metrics

```bash
curl http://127.0.0.1:8787/metrics | jq
```

返回示例：

```json
{
  "total_reviews": 8756,
  "core_reviews": 7209,
  "core_negative_reviews": 1394,
  "embedded_reviews": 1391,
  "issue_clusters": 8,
  "high_severity_clusters": 5
}
```

### 5.3 Cluster 列表

```bash
curl http://127.0.0.1:8787/clusters | jq
```

公网：

```bash
curl http://101.42.36.178/api/clusters | jq
```

### 5.4 单个 Cluster

```bash
curl http://127.0.0.1:8787/clusters/dash_cam_sd_card_storage_issue | jq
```

### 5.5 Cluster 下的代表评论

```bash
curl "http://127.0.0.1:8787/clusters/dash_cam_sd_card_storage_issue/reviews?limit=20" | jq
```

### 5.6 相似评论召回

```bash
curl "http://127.0.0.1:8787/reviews/330/similar?limit=10" | jq
```

## 6. 环境变量

`.env` 不提交 GitHub。

本地创建：

```bash
# .env.example
PORT=8787
HOST=0.0.0.0
DATABASE_URL=postgresql://voc_user:YOUR_PASSWORD@127.0.0.1:5432/voc_agent
```

## 7. PostgreSQL / pgvector 安装与配置

### 7.1 Docker Compose 推荐方式

项目依赖 PostgreSQL 18 + pgvector。

示例 `docker-compose.yml`：

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg18
    container_name: agent_postgres
    restart: always
    environment:
      POSTGRES_DB: voc_agent
      POSTGRES_USER: voc_user
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - ./data/postgres:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: agent_redis
    restart: always
    ports:
      - "6379:6379"
```

启动：

```bash
docker compose up -d
```

验证：

```bash
docker ps
docker exec -it agent_postgres psql -U voc_user -d voc_agent
```

启用 pgvector：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

验证：

```sql
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';
```

## 8. psql 客户端安装与常用配置

### 8.1 Ubuntu 安装 psql

```bash
apt update
apt install -y postgresql-client
```

连接：

```bash
psql -h 127.0.0.1 -p 5432 -U voc_user -d voc_agent
```

### 8.2 配置免密码 `.pgpass`

```bash
cat > ~/.pgpass <<'EOF'
127.0.0.1:5432:voc_agent:voc_user:YOUR_PASSWORD
localhost:5432:voc_agent:voc_user:YOUR_PASSWORD
EOF

chmod 600 ~/.pgpass
```

### 8.3 配置 `.psqlrc`

```bash
cat > ~/.psqlrc <<'EOF'
\pset pager off
\timing on
\set HISTSIZE 2000
EOF
```

### 8.4 配置 alias

```bash
echo "alias vocpsql='psql -h 127.0.0.1 -p 5432 -U voc_user -d voc_agent'" >> ~/.bashrc
source ~/.bashrc
```

使用：

```bash
vocpsql
```

## 9. 核心表结构 SQL

### 9.1 Review Embedding 表

```sql
CREATE TABLE IF NOT EXISTS voc_review_embeddings (
  review_id BIGINT PRIMARY KEY REFERENCES voc_reviews(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  dim INT NOT NULL,
  embedding_text TEXT NOT NULL,
  embedding vector(1024),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voc_review_embeddings_model
ON voc_review_embeddings(model);

CREATE INDEX IF NOT EXISTS idx_voc_review_embeddings_hnsw
ON voc_review_embeddings
USING hnsw (embedding vector_cosine_ops);

ANALYZE voc_review_embeddings;
```

### 9.2 Issue Cluster 表

```sql
CREATE TABLE IF NOT EXISTS voc_issue_clusters (
  id BIGSERIAL PRIMARY KEY,
  cluster_key TEXT UNIQUE NOT NULL,
  product_line TEXT NOT NULL,
  issue_category TEXT,
  cluster_name_en TEXT,
  cluster_name_zh TEXT,
  severity INT,
  representative_review_id BIGINT REFERENCES voc_reviews(id),
  review_count INT DEFAULT 0,
  summary_zh TEXT,
  suggestion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voc_issue_cluster_reviews (
  cluster_id BIGINT REFERENCES voc_issue_clusters(id) ON DELETE CASCADE,
  review_id BIGINT REFERENCES voc_reviews(id) ON DELETE CASCADE,
  similarity NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (cluster_id, review_id)
);
```

## 10. pgvector 相似检索函数

```sql
CREATE OR REPLACE FUNCTION find_similar_reviews(
  p_review_id BIGINT,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  review_id BIGINT,
  marketplace TEXT,
  product_line TEXT,
  last_star INT,
  review_date DATE,
  last_title TEXT,
  content_preview TEXT,
  similarity NUMERIC
)
LANGUAGE sql
AS $$
  WITH target AS (
    SELECT embedding
    FROM voc_review_embeddings
    WHERE review_id = p_review_id
  )
  SELECT
    v.id AS review_id,
    v.marketplace,
    v.product_line,
    v.last_star,
    v.review_date,
    v.last_title,
    left(v.content_clean, 260) AS content_preview,
    ROUND((1 - (e.embedding <=> t.embedding))::numeric, 4) AS similarity
  FROM voc_review_embeddings e
  JOIN target t ON true
  JOIN voc_reviews v ON v.id = e.review_id
  WHERE e.review_id <> p_review_id
  ORDER BY e.embedding <=> t.embedding
  LIMIT p_limit;
$$;
```

示例：

```sql
SELECT * FROM find_similar_reviews(330, 10);
```

## 11. Cluster 视图

### 11.1 Cluster 汇总视图

```sql
CREATE OR REPLACE VIEW v_voc_issue_cluster_summary AS
SELECT
  c.id AS cluster_id,
  c.cluster_key,
  c.product_line,
  c.issue_category,
  c.cluster_name_en,
  c.cluster_name_zh,
  c.severity,
  c.representative_review_id,
  c.summary_zh,
  c.suggestion,
  COUNT(r.review_id) AS linked_reviews,
  ROUND(AVG(r.similarity), 4) AS avg_similarity,
  ROUND(MAX(r.similarity), 4) AS max_similarity,
  ROUND(MIN(r.similarity), 4) AS min_similarity,
  MIN(v.review_date) AS first_review_date,
  MAX(v.review_date) AS last_review_date
FROM voc_issue_clusters c
LEFT JOIN voc_issue_cluster_reviews r ON r.cluster_id = c.id
LEFT JOIN voc_reviews v ON v.id = r.review_id
GROUP BY
  c.id,
  c.cluster_key,
  c.product_line,
  c.issue_category,
  c.cluster_name_en,
  c.cluster_name_zh,
  c.severity,
  c.representative_review_id,
  c.summary_zh,
  c.suggestion;
```

查询：

```sql
SELECT
  product_line,
  issue_category,
  cluster_name_zh,
  severity,
  linked_reviews,
  avg_similarity,
  first_review_date,
  last_review_date
FROM v_voc_issue_cluster_summary
ORDER BY product_line, severity DESC, linked_reviews DESC;
```

### 11.2 Cluster 明细视图

```sql
CREATE OR REPLACE VIEW v_voc_issue_cluster_detail AS
SELECT
  c.id AS cluster_id,
  c.cluster_key,
  c.product_line,
  c.issue_category,
  c.cluster_name_zh,
  c.severity,
  r.review_id,
  r.similarity,
  v.marketplace,
  v.last_star,
  v.review_date,
  v.last_title,
  v.content_clean
FROM voc_issue_clusters c
JOIN voc_issue_cluster_reviews r ON r.cluster_id = c.id
JOIN voc_reviews v ON v.id = r.review_id;
```

查询：

```sql
SELECT
  cluster_name_zh,
  review_id,
  similarity,
  marketplace,
  last_star,
  review_date,
  last_title,
  left(content_clean, 220) AS content
FROM v_voc_issue_cluster_detail
WHERE cluster_key = 'dash_cam_sd_card_storage_issue'
ORDER BY similarity DESC;
```

## 12. Issue Cluster 创建模板

通用模板路径：

```text
/opt/apps/agent-infra/scripts/create_issue_cluster_template.sql
```

模板内容：

```sql
INSERT INTO voc_issue_clusters (
  cluster_key,
  product_line,
  issue_category,
  cluster_name_en,
  cluster_name_zh,
  severity,
  representative_review_id,
  review_count,
  summary_zh,
  suggestion
)
VALUES (
  :'cluster_key',
  :'product_line',
  :'issue_category',
  :'cluster_name_en',
  :'cluster_name_zh',
  :severity,
  :rep_review_id,
  :top_k + 1,
  :'summary_zh',
  :'suggestion'
)
ON CONFLICT (cluster_key) DO UPDATE SET
  product_line = EXCLUDED.product_line,
  issue_category = EXCLUDED.issue_category,
  cluster_name_en = EXCLUDED.cluster_name_en,
  cluster_name_zh = EXCLUDED.cluster_name_zh,
  severity = EXCLUDED.severity,
  representative_review_id = EXCLUDED.representative_review_id,
  review_count = EXCLUDED.review_count,
  summary_zh = EXCLUDED.summary_zh,
  suggestion = EXCLUDED.suggestion;

WITH c AS (
  SELECT id AS cluster_id
  FROM voc_issue_clusters
  WHERE cluster_key = :'cluster_key'
),
target AS (
  SELECT embedding
  FROM voc_review_embeddings
  WHERE review_id = :rep_review_id
),
similar_reviews AS (
  SELECT
    e.review_id,
    ROUND((1 - (e.embedding <=> t.embedding))::numeric, 4) AS similarity
  FROM voc_review_embeddings e
  JOIN target t ON true
  WHERE e.review_id <> :rep_review_id
  ORDER BY e.embedding <=> t.embedding
  LIMIT :top_k
),
all_reviews AS (
  SELECT :rep_review_id::BIGINT AS review_id, 1.0000::NUMERIC AS similarity
  UNION ALL
  SELECT review_id, similarity FROM similar_reviews
)
INSERT INTO voc_issue_cluster_reviews (
  cluster_id,
  review_id,
  similarity
)
SELECT
  c.cluster_id,
  r.review_id,
  r.similarity
FROM c
JOIN all_reviews r ON true
ON CONFLICT (cluster_id, review_id) DO UPDATE SET
  similarity = EXCLUDED.similarity;

SELECT
  c.cluster_key,
  c.cluster_name_zh,
  c.issue_category,
  c.severity,
  COUNT(r.review_id) AS linked_reviews
FROM voc_issue_clusters c
LEFT JOIN voc_issue_cluster_reviews r ON r.cluster_id = c.id
WHERE c.cluster_key = :'cluster_key'
GROUP BY c.cluster_key, c.cluster_name_zh, c.issue_category, c.severity;
```

示例：创建 SD 卡异常簇：

```bash
psql -h 127.0.0.1 -p 5432 -U voc_user -d voc_agent \
  -v cluster_key="dash_cam_sd_card_storage_issue" \
  -v rep_review_id=330 \
  -v product_line="dash_cam" \
  -v issue_category="storage_sd_card" \
  -v cluster_name_en="Dash cam SD card or storage failure" \
  -v cluster_name_zh="行车记录仪 SD 卡、存储或格式化异常问题" \
  -v severity=4 \
  -v top_k=10 \
  -v summary_zh="多条评论反馈行车记录仪出现 SD 卡无法识别、无法格式化、提示损坏、存储卡反复报错、录像停止或附带存储卡短期失效等问题，直接影响录像可靠性。" \
  -v suggestion="建议重点排查 SD 卡兼容性、卡槽耐热与机械结构、文件系统写入稳定性、循环录像策略和异常断电保护，并在说明书中明确推荐卡规格与格式化流程。" \
  -f /opt/apps/agent-infra/scripts/create_issue_cluster_template.sql
```

## 13. Nginx 反向代理

当前 API 通过 Nginx 对外暴露。

配置文件：

```text
/etc/nginx/sites-available/voc-api
```

示例配置：

```nginx
server {
    listen 80;
    server_name 101.42.36.178;

    client_max_body_size 20m;

    location /api/ {
        proxy_pass http://127.0.0.1:8787/;

        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location / {
        return 200 'VOC Review Insight API is running. Try /api/health, /api/metrics, /api/clusters\n';
        add_header Content-Type text/plain;
    }
}
```

检查并重载：

```bash
nginx -t
systemctl reload nginx
```

公网访问：

```bash
curl http://101.42.36.178/api/health
curl http://101.42.36.178/api/metrics
curl http://101.42.36.178/api/clusters
```

## 14. 工程目录建议

```text
voc-api/
├── README.md
├── package.json
├── tsconfig.json
├── .env
├── .env.example
├── .gitignore
└── src/
    ├── db.ts
    └── server.ts
```

## 15. 后续计划

### Phase 1：API 层增强

- 增加分页
- 增加产品线 / 问题类型筛选
- 增加时间范围筛选
- 增加 cluster 搜索
- 增加 OpenAPI 文档

### Phase 2：前端看板

推荐使用：

- Next.js
- TypeScript
- Tailwind CSS
- TanStack Query
- ECharts / Recharts

页面：

- 总览指标页
- Issue Cluster 列表页
- Cluster 详情页
- 相似评论检索页
- Token / LLM 调用追踪页

### Phase 3：Agent 问答

将 API 封装为 Agent Tool：

- `get_metrics`
- `list_clusters`
- `get_cluster_detail`
- `find_similar_reviews`
- `summarize_cluster`

