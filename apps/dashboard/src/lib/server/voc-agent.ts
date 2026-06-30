import type { Cluster, ClusterReview, Metrics } from "@/lib/api";
import { formatDate, issueCategoryLabel, productLineLabel } from "@/lib/utils";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.chenchangchao.com";

const DEEPSEEK_URL = process.env.DEEPSEEK_URL || "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API || process.env.DEEPSEEK_API_KEY || "";

type ClusterListResponse = {
  count: number;
  data: Cluster[];
};

type ClusterReviewResponse = {
  cluster_key: string;
  count: number;
  data: ClusterReview[];
};

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`VOC API request failed: ${res.status} ${text.slice(0, 300)}`);
  }

  return res.json() as Promise<T>;
}

export async function getAgentMetrics() {
  return fetchJson<Metrics>("/metrics");
}

export async function getAgentClusters() {
  return fetchJson<ClusterListResponse>("/clusters");
}

export async function getAgentClusterReviews(clusterKey: string, limit = 20) {
  return fetchJson<ClusterReviewResponse>(
    `/clusters/${clusterKey}/reviews?limit=${limit}`
  );
}

function buildEvidenceMarkdown(params: {
  metrics: Metrics;
  cluster: Cluster;
  reviews: ClusterReview[];
}) {
  const { metrics, cluster, reviews } = params;

  const marketplaces = Array.from(
    new Set(reviews.map((item) => item.marketplace))
  ).join("、");

  const starSummary = [1, 2, 3, 4, 5]
    .map((star) => {
      const count = reviews.filter((item) => item.last_star === star).length;
      return `${star}星 ${count} 条`;
    })
    .join("，");

  const reviewExamples = reviews
    .slice(0, 8)
    .map((review, index) => {
      return `${index + 1}. [${review.marketplace} / ${review.last_star}星 / similarity=${Number(
        review.similarity
      ).toFixed(4)}] ${review.last_title}：${review.content_clean}`;
    })
    .join("\n");

  return `# VOC Issue Cluster Evidence

## 全局指标
- 原始 Review：${metrics.total_reviews}
- 核心产品线 Review：${metrics.core_reviews}
- 核心负向 Review：${metrics.core_negative_reviews}
- 已向量化 Review：${metrics.embedded_reviews}
- Issue Cluster：${metrics.issue_clusters}
- 高严重度 Cluster：${metrics.high_severity_clusters}

## 当前问题簇
- Cluster Key：${cluster.cluster_key}
- 中文名称：${cluster.cluster_name_zh}
- 英文名称：${cluster.cluster_name_en}
- 产品线：${productLineLabel(cluster.product_line)}
- 问题类型：${issueCategoryLabel(cluster.issue_category)}
- 严重度：${cluster.severity}
- 代表评论 ID：${cluster.representative_review_id}
- 关联评论数：${cluster.linked_reviews}
- 平均相似度：${cluster.avg_similarity}
- 相似度范围：${cluster.min_similarity} ~ ${cluster.max_similarity}
- 评论时间范围：${formatDate(cluster.first_review_date)} ~ ${formatDate(cluster.last_review_date)}
- 涉及站点：${marketplaces}
- 星级结构：${starSummary}

## 系统摘要
${cluster.summary_zh}

## 系统建议
${cluster.suggestion}

## 代表评论证据
${reviewExamples}
`;
}

function buildLocal8DReport(params: {
  metrics: Metrics;
  cluster: Cluster;
  reviews: ClusterReview[];
  deepseekError?: string;
}) {
  const { metrics, cluster, reviews, deepseekError } = params;

  const marketplaces = Array.from(
    new Set(reviews.map((item) => item.marketplace))
  ).join("、");

  const oneStarCount = reviews.filter((item) => item.last_star === 1).length;
  const twoStarCount = reviews.filter((item) => item.last_star === 2).length;
  const threeStarCount = reviews.filter((item) => item.last_star === 3).length;

  const topReviews = reviews
    .slice(0, 8)
    .map(
      (review, index) =>
        `${index + 1}. [${review.marketplace} / ${review.last_star}星 / similarity=${Number(
          review.similarity
        ).toFixed(4)}] ${review.last_title}：${review.content_clean}`
    )
    .join("\n");

  return `# 8D 报告草稿：${cluster.cluster_name_zh}

> 生成方式：本地规则兜底模板。
${deepseekError ? `> DeepSeek 调用未完成或失败：${deepseekError}` : ""}

---

## D1：团队建立

建议参与角色：

- 产品经理：确认用户场景、功能预期和商品描述一致性
- 质量工程师：负责问题复盘、8D 推进和 QMS 闭环
- 硬件工程师：排查模组、供电、结构、接口或线材问题
- 固件工程师：排查异常恢复、日志、重启、文件系统、配网等逻辑
- App / 云服务工程师：排查 App 配置、通知、连接和远程诊断能力
- 售后 / 客服：提供工单、退换货、投诉和用户沟通证据
- 制造 / 供应链：确认批次、来料、测试覆盖和制程一致性

---

## D2：问题描述

### 问题簇

${cluster.cluster_name_zh}

### 基础信息

- Cluster Key：${cluster.cluster_key}
- 产品线：${productLineLabel(cluster.product_line)}
- 问题类型：${issueCategoryLabel(cluster.issue_category)}
- 严重度：Severity ${cluster.severity}
- 代表评论 ID：${cluster.representative_review_id}
- 关联评论数：${cluster.linked_reviews}
- 平均相似度：${cluster.avg_similarity.toFixed(4)}
- 相似度范围：${cluster.min_similarity.toFixed(4)} ~ ${cluster.max_similarity.toFixed(4)}
- 时间范围：${formatDate(cluster.first_review_date)} ~ ${formatDate(cluster.last_review_date)}
- 涉及站点：${marketplaces}
- 星级结构：1星 ${oneStarCount} 条，2星 ${twoStarCount} 条，3星 ${threeStarCount} 条

### VOC 事实摘要

${cluster.summary_zh}

---

## D3：临时遏制措施

1. 将该问题簇加入售后高优先级处理清单。
2. 针对同类反馈建立客服识别关键词和排查 SOP。
3. 对高严重度问题提供替换、退款、配件补发或远程诊断方案。
4. 对仍在售商品，补充 FAQ、安装说明、兼容性说明或风险提示。
5. 将代表评论样例同步给质量、研发和售后团队做交叉确认。

---

## D4：根因分析

当前 VOC 证据只能证明用户侧问题现象，不能直接证明工程根因。建议从以下方向验证：

1. 硬件层：模组、接口、卡槽、供电、电池、散热、结构可靠性。
2. 固件层：启动流程、异常恢复、文件系统、循环录像、重连机制。
3. App / 云服务层：配网流程、权限、通知链路、远程控制和诊断能力。
4. 制造层：批次一致性、来料质量、出厂检测、老化测试覆盖率。
5. 用户场景层：安装环境、网络条件、温度、使用频率、第三方配件兼容性。

建议补充证据：

- 售后工单
- 退货原因
- 设备日志
- 固件版本
- 生产批次号
- QMS 不良记录
- 实验室复现结果

---

## D5：永久纠正措施

系统建议：

${cluster.suggestion}

建议拆解为：

1. 工程修复：基于确认根因修改硬件、固件、App 或云服务。
2. 测试增强：增加对应场景的回归测试、压力测试、异常恢复测试。
3. 文档优化：更新说明书、FAQ、商品详情页和售后排查 SOP。
4. 数据监控：持续监控新增评论、退货原因和同类工单趋势。
5. QMS 闭环：将该问题纳入缺陷库并追踪修复版本效果。

---

## D6：措施验证

建议验证指标：

- 新增同类负向评论数下降
- 相关售后工单下降
- 退货率 / 换货率下降
- 固件或硬件修复版本后的投诉下降
- 回归测试通过率提升
- QMS 中相同问题重复发生率下降

当前 VOC 基线：

- 当前代表评论数：${cluster.linked_reviews}
- 当前平均相似度：${cluster.avg_similarity.toFixed(4)}
- 当前最高相似度：${cluster.max_similarity.toFixed(4)}
- 当前最低相似度：${cluster.min_similarity.toFixed(4)}

---

## D7：预防再发

1. 将该问题转化为新品导入测试 checklist。
2. 将代表评论转化为测试用例和异常场景。
3. 将该 cluster 加入 VOC 周报和质量例会。
4. 对高风险问题建立自动预警规则。
5. 后续接入 Agent 定时扫描新增评论，自动触发质量复盘。

---

## D8：团队认可与经验沉淀

1. 该问题应按跨用户、跨站点的质量问题簇管理，而不是单条差评。
2. Embedding + pgvector 可以发现多语言、多表达方式下的同类 VOC。
3. 8D 草稿是质量工程师工作台，不替代人工确认。
4. 后续应打通 VOC、QMS、售后工单和设备日志，形成完整闭环。

---

## 代表评论证据

${topReviews}

---

## 飞书推送摘要

【${cluster.cluster_name_zh}】当前从 VOC 中识别到 ${cluster.linked_reviews} 条代表评论，涉及 ${marketplaces} 等站点，平均相似度 ${cluster.avg_similarity.toFixed(4)}，严重度 ${cluster.severity}。建议质量、研发和售后团队基于该问题簇开展 8D 复盘，重点验证工程根因、短期遏制措施和长期纠正措施。
`;
}

async function callDeepSeek(prompt: string) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API or DEEPSEEK_API_KEY is required");
  }

  const controller = new AbortController();
  const timeout = windowlessSetTimeout(() => controller.abort(), 70_000);

  try {
    const res = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL || "deepseek-chat",
        temperature: 0.2,
        max_tokens: 3500,
        messages: [
          {
            role: "system",
            content:
              "你是资深质量工程师和智能硬件 VOC 分析专家，擅长基于用户评论证据生成结构化 8D 报告草稿。请使用中文，保持专业、可执行、可追溯。"
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek request failed: ${res.status} ${text.slice(0, 500)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("DeepSeek returned empty content");
    }

    return content as string;
  } finally {
    clearTimeout(timeout);
  }
}

function windowlessSetTimeout(fn: () => void, ms: number) {
  return setTimeout(fn, ms);
}

export async function generate8DReportByAgent(clusterKey: string) {
  const [metrics, clustersResult, reviewsResult] = await Promise.all([
    getAgentMetrics(),
    getAgentClusters(),
    getAgentClusterReviews(clusterKey, 20)
  ]);

  const cluster = clustersResult.data.find(
    (item) => item.cluster_key === clusterKey
  );

  if (!cluster) {
    throw new Error(`Cluster not found: ${clusterKey}`);
  }

  const reviews = reviewsResult.data;

  const evidence = buildEvidenceMarkdown({
    metrics,
    cluster,
    reviews
  });

  const prompt = `请基于下面的 VOC 证据，生成一份 8D 报告草稿。

要求：
1. 输出 Markdown。
2. 必须包含 D1-D8。
3. 必须明确区分“VOC 证据事实”和“待工程验证假设”。
4. D4 根因分析不要武断下结论，要列出可能根因和验证方式。
5. D5/D6/D7 要给出可执行动作。
6. 用语适合产品、质量、售后、研发团队协作。
7. 最后给出“飞书推送摘要”，控制在 300 字以内。

${evidence}`;

  try {
    const report = await callDeepSeek(prompt);

    return {
      cluster,
      reviews,
      metrics,
      evidence,
      report,
      report_source: "deepseek" as const
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const report = buildLocal8DReport({
      metrics,
      cluster,
      reviews,
      deepseekError: message
    });

    return {
      cluster,
      reviews,
      metrics,
      evidence,
      report,
      report_source: "local_fallback" as const,
      deepseek_error: message
    };
  }
}

export async function sendTextToFeishu(text: string) {
  const webhook = process.env.FEISHU_WEBHOOK_URL;

  if (!webhook) {
    throw new Error("FEISHU_WEBHOOK_URL is required");
  }

  const res = await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      msg_type: "text",
      content: {
        text
      }
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Feishu webhook failed: ${res.status} ${body}`);
  }

  return res.json();
}


function normalizeFeishuText(text: string, maxLength = 1200) {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export async function sendFeishuInteractiveCard(params: {
  clusterKey: string;
  clusterNameZh: string;
  productLine: string;
  issueCategory: string;
  severity: number;
  linkedReviews: number;
  avgSimilarity: number;
  summary: string;
  reportUrl: string;
  detailUrl: string;
  apiUrl: string;
}) {
  const webhook = process.env.FEISHU_WEBHOOK_URL;

  if (!webhook) {
    throw new Error("FEISHU_WEBHOOK_URL is required");
  }

  const severityColor = params.severity >= 4 ? "red" : "orange";
  const summary = normalizeFeishuText(params.summary, 1000);

  const overview =
    `**问题簇：** ${params.clusterNameZh}\n` +
    `**Cluster：** ${params.clusterKey}\n` +
    `**产品线：** ${params.productLine}\n` +
    `**问题类型：** ${params.issueCategory}\n` +
    `**严重度：** Severity ${params.severity}\n` +
    `**代表评论：** ${params.linkedReviews} 条\n` +
    `**平均相似度：** ${params.avgSimilarity.toFixed(4)}`;

  const res = await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      msg_type: "interactive",
      card: {
        config: {
          wide_screen_mode: true
        },
        header: {
          title: {
            tag: "plain_text",
            content: "VOC 8D 报告草稿"
          },
          template: severityColor
        },
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: overview
            }
          },
          {
            tag: "hr"
          },
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: `**Agent 摘要：**\n${summary}`
            }
          },
          {
            tag: "hr"
          },
          {
            tag: "action",
            actions: [
              {
                tag: "button",
                text: {
                  tag: "plain_text",
                  content: "打开 8D 报告"
                },
                type: "primary",
                url: params.reportUrl
              },
              {
                tag: "button",
                text: {
                  tag: "plain_text",
                  content: "查看 Cluster"
                },
                type: "default",
                url: params.detailUrl
              },
              {
                tag: "button",
                text: {
                  tag: "plain_text",
                  content: "API JSON"
                },
                type: "default",
                url: params.apiUrl
              }
            ]
          },
          {
            tag: "note",
            elements: [
              {
                tag: "plain_text",
                content:
                  "由 VOC Review Insight Agent 自动生成。完整 Markdown 报告会作为附件发送。"
              }
            ]
          }
        ]
      }
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Feishu card webhook failed: ${res.status} ${body}`);
  }

  return res.json();
}

async function getFeishuTenantAccessToken() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("FEISHU_APP_ID and FEISHU_APP_SECRET are required");
  }

  const res = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret
      })
    }
  );

  const data = await res.json();

  if (!res.ok || data.code !== 0) {
    throw new Error(
      `Get Feishu tenant_access_token failed: ${res.status} ${JSON.stringify(
        data
      )}`
    );
  }

  return data.tenant_access_token as string;
}

async function uploadMarkdownFileToFeishu(params: {
  token: string;
  fileName: string;
  markdown: string;
}) {
  const form = new FormData();

  const file = new Blob([params.markdown], {
    type: "text/markdown;charset=utf-8"
  });

  form.append("file_type", "stream");
  form.append("file_name", params.fileName);
  form.append("file", file, params.fileName);

  const res = await fetch("https://open.feishu.cn/open-apis/im/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`
    },
    body: form
  });

  const data = await res.json();

  if (!res.ok || data.code !== 0) {
    throw new Error(
      `Upload Feishu file failed: ${res.status} ${JSON.stringify(data)}`
    );
  }

  return data.data.file_key as string;
}

async function sendFeishuFileMessage(params: {
  token: string;
  chatId: string;
  fileKey: string;
}) {
  const res = await fetch(
    "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        receive_id: params.chatId,
        msg_type: "file",
        content: JSON.stringify({
          file_key: params.fileKey
        })
      })
    }
  );

  const data = await res.json();

  if (!res.ok || data.code !== 0) {
    throw new Error(
      `Send Feishu file message failed: ${res.status} ${JSON.stringify(data)}`
    );
  }

  return data;
}

export async function sendMarkdownReportFileToFeishu(params: {
  clusterKey: string;
  clusterNameZh: string;
  markdown: string;
}) {
  const chatId = process.env.FEISHU_CHAT_ID;

  if (!chatId) {
    throw new Error("FEISHU_CHAT_ID is required");
  }

  const token = await getFeishuTenantAccessToken();

  const safeName = params.clusterKey.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `8D_Report_${safeName}.md`;

  const fileKey = await uploadMarkdownFileToFeishu({
    token,
    fileName,
    markdown: params.markdown
  });

  const sendResult = await sendFeishuFileMessage({
    token,
    chatId,
    fileKey
  });

  return {
    file_name: fileName,
    file_key: fileKey,
    send_result: sendResult
  };
}
