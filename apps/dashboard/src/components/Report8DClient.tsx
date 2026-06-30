"use client";

import Link from "next/link";
import { ArrowLeft, Clipboard, ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { Cluster, ClusterReview } from "@/lib/api";
import { formatDate, issueCategoryLabel, productLineLabel } from "@/lib/utils";

type Props = {
  cluster: Cluster;
  reviews: ClusterReview[];
};

export function Report8DClient({ cluster, reviews }: Props) {
  const [copied, setCopied] = useState(false);

  const reportMarkdown = useMemo(() => {
    return build8DReport(cluster, reviews);
  }, [cluster, reviews]);

  async function copyReport() {
    await navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <section className="mx-auto max-w-5xl px-6 py-8 pt-24">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href={`/clusters/${cluster.cluster_key}`}
            className="inline-flex items-center gap-2 text-sm text-cyan-700 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
          >
            <ArrowLeft className="h-4 w-4" />
            返回 Cluster 详情
          </Link>

          <button
            type="button"
            onClick={copyReport}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
          >
            {copied ? (
              <ClipboardCheck className="h-4 w-4" />
            ) : (
              <Clipboard className="h-4 w-4" />
            )}
            {copied ? "已复制 8D 草稿" : "复制 8D Markdown"}
          </button>
        </div>

        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="text-sm text-cyan-700 dark:text-cyan-300">
            8D Report Draft
          </div>
          <h1 className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
            {cluster.cluster_name_zh}
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            基于 VOC Issue Cluster、代表评论、相似度和改进建议自动生成的 8D 草稿。
            后续可接入 LLM Agent 做自动润色、根因补全和 QMS 流转。
          </p>
        </header>

        <article className="mt-8 whitespace-pre-wrap rounded-3xl border border-slate-200 bg-white p-6 font-mono text-sm leading-7 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
          {reportMarkdown}
        </article>
      </section>
    </main>
  );
}

function build8DReport(cluster: Cluster, reviews: ClusterReview[]) {
  const marketplaces = Array.from(new Set(reviews.map((item) => item.marketplace))).join("、");
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

> 本报告由 VOC Review Insight Dashboard 基于 Amazon Review、BGE-M3 Embedding、pgvector 相似召回和 Issue Cluster 自动生成。当前版本为质量工程师初稿，需要结合真实生产、售后、固件、硬件和 QMS 数据进行人工确认。

---

## D1：团队建立

建议参与角色：

- 产品经理：确认用户场景和产品需求定义
- 质量工程师：负责问题复盘、质量闭环和 8D 推进
- 硬件工程师：排查硬件设计、模组、供电、结构或接口问题
- 固件工程师：排查固件稳定性、异常恢复和日志
- App / 云服务工程师：排查连接、通知、配置和远程诊断问题
- 售后 / 客服：提供退换货、投诉和用户沟通证据
- 供应链 / 制造：确认批次、来料、测试和制程一致性

---

## D2：问题描述

### 问题簇

${cluster.cluster_name_zh}

### Cluster Key

${cluster.cluster_key}

### 产品线

${productLineLabel(cluster.product_line)}

### 问题类型

${issueCategoryLabel(cluster.issue_category)}

### 严重度

Severity ${cluster.severity}

### VOC 证据范围

- 关联代表评论数：${cluster.linked_reviews}
- 代表评论 ID：${cluster.representative_review_id}
- 平均相似度：${cluster.avg_similarity.toFixed(4)}
- 相似度范围：${cluster.min_similarity.toFixed(4)} ~ ${cluster.max_similarity.toFixed(4)}
- 评论时间范围：${formatDate(cluster.first_review_date)} ~ ${formatDate(cluster.last_review_date)}
- 涉及站点：${marketplaces}
- 星级结构：1星 ${oneStarCount} 条，2星 ${twoStarCount} 条，3星 ${threeStarCount} 条

### 问题摘要

${cluster.summary_zh}

---

## D3：临时遏制措施

建议短期动作：

1. 将该问题簇加入售后高优先级排查清单。
2. 对相同问题用户提供明确的排查 SOP，避免反复要求用户自行尝试。
3. 对高严重度问题提供替换、退款、配件补发或远程诊断方案。
4. 在客服话术中增加该问题的识别关键词和处理路径。
5. 对仍在售产品，在详情页 FAQ 中补充限制条件和排查方法。

---

## D4：根因分析

当前 VOC 只能证明用户侧问题现象，不能直接证明工程根因。建议从以下方向排查：

1. 硬件层：模组、接口、线材、卡槽、供电、电池、散热、结构强度。
2. 固件层：启动流程、异常恢复、日志记录、文件系统、重连机制。
3. App / 云服务层：配网流程、通知链路、远程控制、权限、兼容性。
4. 制造层：批次一致性、来料质量、老化测试、出厂检测覆盖率。
5. 用户场景层：环境温度、网络条件、安装方式、使用频率、存储介质规格。

建议结合：
- 售后工单
- 退货原因
- 设备日志
- 固件版本
- 批次号
- QMS 不良记录
- 实验室复现结果

---

## D5：永久纠正措施

建议长期措施：

${cluster.suggestion}

可进一步拆解为：

1. 工程修复：针对确认根因修改硬件、固件、App 或云服务。
2. 测试增强：增加对应场景的回归测试、压力测试、老化测试和异常恢复测试。
3. 文档优化：更新说明书、FAQ、商品详情页和售后排查 SOP。
4. 质量闭环：将该问题纳入 QMS 缺陷库，并追踪版本修复效果。
5. 数据监控：持续监控该 cluster 的新增评论数量、严重度和相似问题趋势。

---

## D6：措施验证

建议验证指标：

- 新增同类负向评论数量下降
- 退货率 / 换货率下降
- 相关售后工单减少
- 固件或硬件修复版本后投诉下降
- 回归测试通过率提升
- QMS 中相同问题重复发生率下降

当前可用 VOC 基线：

- 当前 cluster 评论数：${cluster.linked_reviews}
- 当前平均相似度：${cluster.avg_similarity.toFixed(4)}
- 当前最高相似度：${cluster.max_similarity.toFixed(4)}
- 当前最低相似度：${cluster.min_similarity.toFixed(4)}

---

## D7：预防再发

建议预防措施：

1. 将该问题纳入新品导入测试 checklist。
2. 将代表评论转化为测试用例。
3. 将该 cluster 的关键词和 embedding 检索纳入 VOC 周报。
4. 对高风险问题建立 QMS 自动预警规则。
5. 若后续 Agent 化，可定期自动扫描新增评论并触发质量复盘。

---

## D8：团队认可与经验沉淀

经验沉淀：

- 该问题不应只作为单条差评处理，而应作为跨站点、跨用户的质量问题簇管理。
- Embedding + pgvector 可以发现多语言、多表达方式下的同类问题。
- 8D 报告草稿应作为质量工程师的初始工作台，而不是替代人工判断。
- 后续应将 VOC、QMS、售后工单、设备日志打通，实现更完整的闭环。

---

## 代表评论证据

${topReviews}
`;
}
