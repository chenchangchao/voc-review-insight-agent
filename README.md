# VOC Review Insight Agent

An AI Data Agent demo for Amazon VOC review analysis, negative review clustering, root-cause classification, semantic retrieval, and evidence-based 8D report generation.

## Features

- VOC dashboard for Amazon review analytics
- Multi-language review analysis
- Negative review classification and clustering
- Issue category, severity, representative reviews, and trend analysis
- Agent workflow for review insight and 8D report generation
- PostgreSQL / pgvector based semantic retrieval
- Public dashboard without exposing sensitive customer data

## Architecture

```text
Browser
  ↓
voc.chenchangchao.com
  ↓
Oracle Cloud Nginx
  ↓
Next.js VOC Dashboard
  ↓
VOC API
  ↓
Tencent Cloud voc-api
  ↓
PostgreSQL / pgvector
```
## Apps
apps/dashboard   Next.js dashboard deployed on Oracle Cloud
apps/voc-api     Bun/Node API deployed on Tencent Cloud
Typical Agent Questions
分析 dash_cam 最近差评集中在哪些问题上？
查询 video_doorbell 的 connectivity 类问题有哪些代表评论？
生成 ipc 产品 hardware_failure 问题的 8D 报告。
对比 dash_cam、ipc、video_doorbell 三类产品的负面评论严重度。
Data Boundary

The public demo only exposes aggregated and desensitized VOC analytics. It does not expose private customer data, raw sensitive fields, credentials, API keys, or database secrets.
