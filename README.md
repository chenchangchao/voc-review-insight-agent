# VOC Review Insight Agent

面向 Amazon 智能硬件评论的 VOC 洞察与 Agent 分析系统。项目将多语言评论数据清洗、聚类、向量召回和 8D 报告生成串联起来，用于发现负向评价中的产品质量问题、根因线索和改进机会。

## 项目定位

本仓库采用 monorepo 架构，统一管理前端看板、后端 API 与部署配置：

| 路径 | 模块 | 说明 |
| --- | --- | --- |
| `apps/dashboard` | VOC 看板 | 基于 Next.js 的数据展示、问题簇详情、8D 报告和 Agent 工作台 |
| `apps/voc-api` | VOC API | 基于 Bun + Fastify 的指标、问题簇、代表评论和相似评论接口 |
| `infra/nginx` | Nginx 配置 | 公网域名与反向代理配置 |
| `infra/pm2` | PM2 配置 | 生产环境进程守护配置 |

## 核心能力

- 多语言 Amazon Review 数据分析
- 负向评论识别、分类与 Issue Cluster 聚合
- 问题类别、严重度、代表评论和趋势分析
- 基于 PostgreSQL / pgvector 的语义召回
- 面向产品质量分析的 Agent 问答与 8D 报告生成
- 公网看板只暴露聚合、脱敏后的 VOC 分析结果

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 包管理 | Bun workspace，兼容 pnpm workspace |
| 前端 | Next.js App Router、React、TypeScript、Tailwind CSS、Recharts |
| 后端 | Bun、TypeScript、Fastify、Zod |
| 数据 | PostgreSQL、pgvector、BGE-M3 Embedding |
| 部署 | PM2、Nginx、Cloudflare Tunnel、Oracle Cloud、Tencent Cloud |

## 系统架构

```text
用户浏览器
  ↓
voc.chenchangchao.com
  ↓
Cloudflare / Oracle Cloud Nginx
  ↓
Next.js VOC Dashboard
  ↓
VOC API
  ↓
Tencent Cloud voc-api
  ↓
PostgreSQL / pgvector
```

## 快速开始

优先使用 Bun 安装依赖：

```bash
bun install
```

如果本地必须使用 pnpm，也可以通过 workspace 配置安装：

```bash
pnpm install
```

### 环境变量

前端：

```bash
cp apps/dashboard/.env.example apps/dashboard/.env.local
```

后端：

```bash
cp apps/voc-api/.env.example apps/voc-api/.env
```

按需修改 API 地址、端口和数据库连接字符串。

### 本地开发

同时启动所有应用：

```bash
bun run dev
```

单独启动前端：

```bash
bun run dev:dashboard
```

单独启动后端：

```bash
bun run dev:api
```

默认访问地址：

| 服务 | 地址 |
| --- | --- |
| Dashboard | `http://127.0.0.1:3000` |
| API | `http://127.0.0.1:8787` |

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `bun install` | 在根目录安装全部 workspace 依赖 |
| `bun run dev` | 启动所有应用的开发服务 |
| `bun run dev:dashboard` | 启动 Next.js 看板 |
| `bun run dev:api` | 启动 Fastify API |
| `bun run build` | 构建前端应用 |
| `bun run lint` | 检查前端代码 |
| `bun run start:dashboard` | 启动前端生产服务 |
| `bun run start:api` | 启动后端服务 |

## 典型 Agent 问题

- 分析 `dash_cam` 最近差评集中在哪些问题上？
- 查询 `video_doorbell` 的连接类问题有哪些代表评论？
- 生成 `ipc` 产品硬件失效问题的 8D 报告。
- 对比 `dash_cam`、`ipc`、`video_doorbell` 三类产品的负面评论严重度。

## 数据边界

公网 Demo 仅暴露聚合和脱敏后的 VOC 分析结果，不暴露私有客户数据、原始敏感字段、凭证、API Key 或数据库密钥。

## 更多文档

- [Dashboard 说明](./apps/dashboard/README.md)
- [VOC API 说明](./apps/voc-api/README.md)
