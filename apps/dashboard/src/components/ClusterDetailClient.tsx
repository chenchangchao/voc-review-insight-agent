"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Clipboard,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Star
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useMemo, useState } from "react";
import type { Cluster, ClusterReview } from "@/lib/api";
import { formatDate, issueCategoryLabel, productLineLabel } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

type Props = {
  cluster: Cluster;
  reviews: ClusterReview[];
};

const chartColors = [
  "#22d3ee",
  "#a78bfa",
  "#fb7185",
  "#facc15",
  "#34d399",
  "#f97316",
  "#60a5fa",
  "#e879f9"
];

export function ClusterDetailClient({ cluster, reviews }: Props) {
  const { resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const isDark = resolvedTheme === "dark";
  const axisColor = isDark ? "#94a3b8" : "#475569";
  const tooltipStyle = {
    backgroundColor: isDark ? "#020617" : "#ffffff",
    border: `1px solid ${isDark ? "#1e293b" : "#cbd5e1"}`,
    borderRadius: "12px",
    color: isDark ? "#e2e8f0" : "#0f172a"
  };

  const marketplaceData = useMemo(() => {
    return groupCount(reviews, "marketplace");
  }, [reviews]);

  const starData = useMemo(() => {
    return groupCount(reviews, "last_star")
      .sort((a, b) => Number(a.name) - Number(b.name))
      .map((item) => ({
        ...item,
        name: `${item.name} 星`
      }));
  }, [reviews]);

  const similarityData = useMemo(() => {
    const buckets = [
      { name: "≥ 0.90", min: 0.9, max: 1.01 },
      { name: "0.85-0.90", min: 0.85, max: 0.9 },
      { name: "0.80-0.85", min: 0.8, max: 0.85 },
      { name: "< 0.80", min: 0, max: 0.8 }
    ];

    return buckets.map((bucket) => ({
      name: bucket.name,
      value: reviews.filter((review) => {
        const sim = Number(review.similarity);
        return sim >= bucket.min && sim < bucket.max;
      }).length
    }));
  }, [reviews]);

  const qualitySummary = buildQualitySummary(cluster, reviews);

  async function copySummary() {
    await navigator.clipboard.writeText(qualitySummary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <section className="mx-auto max-w-6xl px-6 py-8 pt-24">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-cyan-700 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
        >
          <ArrowLeft className="h-4 w-4" />
          返回总览
        </Link>

        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge>{productLineLabel(cluster.product_line)}</Badge>
            <Badge>{issueCategoryLabel(cluster.issue_category)}</Badge>
            <SeverityBadge severity={cluster.severity} />
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950 dark:text-white">
                {cluster.cluster_name_zh}
              </h1>

              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                {cluster.cluster_name_en}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copySummary}
                className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
              >
                {copied ? (
                  <ClipboardCheck className="h-4 w-4" />
                ) : (
                  <Clipboard className="h-4 w-4" />
                )}
                {copied ? "已复制" : "复制质量摘要"}
              </button>

              <Link
                href={`/reports/8d/${cluster.cluster_key}`}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
              >
                <FileText className="h-4 w-4" />
                生成 8D 草稿
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <InfoCard label="代表评论 ID" value={cluster.representative_review_id} />
            <InfoCard label="关联评论" value={cluster.linked_reviews} />
            <InfoCard
              label="平均相似度"
              value={cluster.avg_similarity.toFixed(4)}
            />
            <InfoCard
              label="时间范围"
              value={`${formatDate(cluster.first_review_date)} ~ ${formatDate(
                cluster.last_review_date
              )}`}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/70">
              <h2 className="font-semibold text-slate-950 dark:text-white">
                问题摘要
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {cluster.summary_zh}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/70">
              <h2 className="font-semibold text-slate-950 dark:text-white">
                改进建议
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {cluster.suggestion}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <ChartCard title="国家站点分布" subtitle="代表评论来自哪些 marketplace">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={marketplaceData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={78}
                  label={{ fill: axisColor, fontSize: 12 }}
                >
                  {marketplaceData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={chartColors[index % chartColors.length]}
                      stroke={isDark ? "#0f172a" : "#ffffff"}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="星级分布" subtitle="负向评论的星级结构">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={starData}>
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {starData.map((item, index) => (
                    <Cell
                      key={index}
                      fill={Number(String(item.name).replace(" 星", "")) <= 1 ? "#fb7185" : "#facc15"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="相似度分布" subtitle="pgvector 召回结果集中程度">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={similarityData}>
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {similarityData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                代表评论与相似度
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                由 pgvector 根据代表评论向量召回。
              </p>
            </div>

            <a
              href={`https://api.chenchangchao.com/clusters/${cluster.cluster_key}/reviews`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              API JSON
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="space-y-4">
            {reviews.map((review) => (
              <article
                key={review.review_id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/70"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                    #{review.review_id}
                  </span>
                  <span>{review.marketplace}</span>
                  <span>{formatDate(review.review_date)}</span>
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-200">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {review.last_star}
                  </span>
                  <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">
                    similarity {Number(review.similarity).toFixed(4)}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-950 dark:text-white">
                  {review.last_title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {review.content_clean}
                </p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function buildQualitySummary(cluster: Cluster, reviews: ClusterReview[]) {
  const marketplaces = Array.from(new Set(reviews.map((item) => item.marketplace))).join("、");
  const examples = reviews
    .slice(0, 5)
    .map(
      (review, index) =>
        `${index + 1}. [${review.marketplace} ${review.last_star}星 similarity=${Number(
          review.similarity
        ).toFixed(4)}] ${review.last_title}：${review.content_clean}`
    )
    .join("\n");

  return `# VOC 质量问题摘要

## 问题簇
${cluster.cluster_name_zh}

## Cluster Key
${cluster.cluster_key}

## 产品线
${productLineLabel(cluster.product_line)}

## 问题类型
${issueCategoryLabel(cluster.issue_category)}

## 严重度
Severity ${cluster.severity}

## 数据证据
- 代表评论 ID：${cluster.representative_review_id}
- 关联评论数：${cluster.linked_reviews}
- 平均相似度：${cluster.avg_similarity.toFixed(4)}
- 相似度范围：${cluster.min_similarity.toFixed(4)} ~ ${cluster.max_similarity.toFixed(4)}
- 评论时间范围：${formatDate(cluster.first_review_date)} ~ ${formatDate(cluster.last_review_date)}
- 涉及站点：${marketplaces}

## 问题摘要
${cluster.summary_zh}

## 改进建议
${cluster.suggestion}

## 代表评论样例
${examples}
`;
}

function ChartCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {children}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: number }) {
  const danger = severity >= 4;

  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        danger
          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
          : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
      ].join(" ")}
    >
      severity {severity}
    </span>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/70">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function groupCount<T extends Record<string, any>>(
  items: T[],
  key: keyof T
): { name: string; value: number }[] {
  const map = new Map<string, number>();

  for (const item of items) {
    const name = String(item[key]);
    map.set(name, (map.get(name) || 0) + 1);
  }

  return Array.from(map.entries()).map(([name, value]) => ({
    name,
    value
  }));
}
