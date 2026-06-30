"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Database,
  Layers,
  Radar,
  Search,
  Server,
  ShieldAlert,
  Sparkles,
  X
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
import type { Cluster, Metrics } from "@/lib/api";
import { formatDate, issueCategoryLabel, productLineLabel } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

type Health = {
  status: string;
  db_time: string;
};

type Props = {
  health: Health;
  metrics: Metrics;
  clusters: Cluster[];
};

const productLineOptions = [
  { label: "全部产品线", value: "all" },
  { label: "行车记录仪", value: "dash_cam" },
  { label: "视频门铃", value: "video_doorbell" },
  { label: "IPC 摄像机", value: "ipc" }
];

const severityOptions = [
  { label: "全部严重度", value: "all" },
  { label: "高严重度 ≥ 4", value: "high" },
  { label: "severity = 4", value: "4" },
  { label: "severity = 3", value: "3" }
];

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

export function DashboardClient({ health, metrics, clusters }: Props) {
  const { resolvedTheme } = useTheme();

  const [keyword, setKeyword] = useState("");
  const [productLine, setProductLine] = useState("all");
  const [issueCategory, setIssueCategory] = useState("all");
  const [severity, setSeverity] = useState("all");

  const isDark = resolvedTheme === "dark";

  const axisColor = isDark ? "#94a3b8" : "#475569";
  const tooltipStyle = {
    backgroundColor: isDark ? "#020617" : "#ffffff",
    border: `1px solid ${isDark ? "#1e293b" : "#cbd5e1"}`,
    borderRadius: "12px",
    color: isDark ? "#e2e8f0" : "#0f172a"
  };

  const issueCategoryOptions = useMemo(() => {
    const values = Array.from(
      new Set(clusters.map((item) => item.issue_category))
    ).sort();

    return [
      { label: "全部问题类型", value: "all" },
      ...values.map((value) => ({
        label: issueCategoryLabel(value),
        value
      }))
    ];
  }, [clusters]);

  const filteredClusters = useMemo(() => {
    const kw = keyword.trim().toLowerCase();

    return clusters.filter((cluster) => {
      const matchKeyword =
        !kw ||
        [
          cluster.cluster_key,
          cluster.cluster_name_zh,
          cluster.cluster_name_en,
          cluster.product_line,
          cluster.issue_category,
          cluster.summary_zh,
          cluster.suggestion
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(kw));

      const matchProductLine =
        productLine === "all" || cluster.product_line === productLine;

      const matchIssueCategory =
        issueCategory === "all" || cluster.issue_category === issueCategory;

      const matchSeverity =
        severity === "all" ||
        (severity === "high" && cluster.severity >= 4) ||
        String(cluster.severity) === severity;

      return (
        matchKeyword &&
        matchProductLine &&
        matchIssueCategory &&
        matchSeverity
      );
    });
  }, [clusters, keyword, productLine, issueCategory, severity]);

  const highSeverityClusters = clusters.filter((item) => item.severity >= 4);

  const productLineChartData = useMemo(() => {
    return groupCount(clusters, "product_line").map((item) => ({
      name: productLineLabel(item.name),
      value: item.value
    }));
  }, [clusters]);

  const issueCategoryChartData = useMemo(() => {
    return groupCount(clusters, "issue_category").map((item) => ({
      name: issueCategoryLabel(item.name),
      value: item.value
    }));
  }, [clusters]);

  const severityChartData = useMemo(() => {
    return groupCount(clusters, "severity").map((item) => ({
      name: `severity ${item.name}`,
      value: item.value
    }));
  }, [clusters]);

  const latestReviewDate =
    clusters
      .map((item) => item.last_review_date)
      .sort()
      .at(-1) || "";

  function resetFilters() {
    setKeyword("");
    setProductLine("all");
    setIssueCategory("all");
    setSeverity("all");
  }

  const hasFilter =
    keyword || productLine !== "all" || issueCategory !== "all" || severity !== "all";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-8 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-700 dark:text-cyan-200">
              <Sparkles className="h-4 w-4" />
              VOC Review Insight Dashboard
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white lg:text-5xl">
              智能硬件 VOC 问题洞察看板
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 lg:text-base">
              基于 BGE-M3 多语言 Embedding、PostgreSQL pgvector 和 Fastify API，
              对 Amazon 评论进行负向问题聚类，沉淀可追溯的产品质量 Issue Cluster。
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/agent"
                className="inline-flex items-center rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
              >
                打开 8D 报告 Agent
              </Link>
              <a
                href="https://api.chenchangchao.com/clusters"
                target="_blank"
                className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                查看 API JSON
              </a>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end pr-0 lg:pr-48">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                API 状态：
                <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                  {health.status}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                DB Time: {new Date(health.db_time).toLocaleString("zh-CN")}
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <MetricCard icon={<Database />} label="原始评论" value={metrics.total_reviews} />
          <MetricCard icon={<Layers />} label="核心产品评论" value={metrics.core_reviews} />
          <MetricCard icon={<ShieldAlert />} label="核心负向评论" value={metrics.core_negative_reviews} />
          <MetricCard icon={<Radar />} label="已向量化评论" value={metrics.embedded_reviews} />
          <MetricCard icon={<BarChart3 />} label="问题簇" value={metrics.issue_clusters} />
          <MetricCard
            icon={<AlertTriangle />}
            label="高严重度簇"
            value={metrics.high_severity_clusters}
            highlight
          />
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                筛选与搜索
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                按产品线、问题类型、严重度和关键词快速定位 VOC 问题。
              </p>
            </div>

            {hasFilter ? (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
                清空筛选
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索 cluster / 摘要 / 建议"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400"
              />
            </div>

            <Select value={productLine} onChange={setProductLine} options={productLineOptions} />
            <Select value={issueCategory} onChange={setIssueCategory} options={issueCategoryOptions} />
            <Select value={severity} onChange={setSeverity} options={severityOptions} />
          </div>

          <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            当前显示：
            <span className="mx-1 font-semibold text-cyan-700 dark:text-cyan-200">
              {filteredClusters.length}
            </span>
            / {clusters.length} 个问题簇
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <ChartCard title="产品线分布" subtitle="按产品线统计问题簇数量">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={productLineChartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label={{ fill: axisColor, fontSize: 12 }}
                >
                  {productLineChartData.map((_, index) => (
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

          <ChartCard title="问题类型分布" subtitle="按 issue_category 统计">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={issueCategoryChartData}>
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {issueCategoryChartData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="严重度分布" subtitle="高严重度问题需要优先排查">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={severityChartData}>
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {severityChartData.map((item, index) => (
                    <Cell
                      key={index}
                      fill={String(item.name).includes("4") ? "#fb7185" : "#facc15"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                  Issue Cluster 总览
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  每个问题簇包含代表评论、相似评论、严重度、摘要和改进建议。
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {filteredClusters.length} clusters
              </span>
            </div>

            <div className="space-y-4">
              {filteredClusters.map((cluster) => (
                <Link
                  key={cluster.cluster_key}
                  href={`/clusters/${cluster.cluster_key}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-cyan-500 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-cyan-400/60 dark:hover:bg-slate-900"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge>{productLineLabel(cluster.product_line)}</Badge>
                        <Badge>{issueCategoryLabel(cluster.issue_category)}</Badge>
                        <SeverityBadge severity={cluster.severity} />
                      </div>

                      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                        {cluster.cluster_name_zh}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {cluster.summary_zh}
                      </p>
                    </div>

                    <div className="grid min-w-44 grid-cols-3 gap-2 text-center text-xs text-slate-500 dark:text-slate-400">
                      <SmallStat label="评论" value={cluster.linked_reviews} />
                      <SmallStat label="均相似" value={cluster.avg_similarity.toFixed(4)} />
                      <SmallStat label="严重度" value={cluster.severity} />
                    </div>
                  </div>
                </Link>
              ))}

              {filteredClusters.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  没有匹配的问题簇，请调整筛选条件。
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                高严重度问题
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                severity ≥ 4，优先进入产品、质量和售后排查。
              </p>

              <div className="mt-5 space-y-3">
                {highSeverityClusters.map((cluster) => (
                  <Link
                    key={cluster.cluster_key}
                    href={`/clusters/${cluster.cluster_key}`}
                    className="block rounded-xl bg-red-50 p-4 text-sm hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/15"
                  >
                    <div className="font-medium text-red-800 dark:text-red-100">
                      {cluster.cluster_name_zh}
                    </div>
                    <div className="mt-1 text-xs text-red-600 dark:text-red-200/70">
                      {productLineLabel(cluster.product_line)} ·{" "}
                      {cluster.linked_reviews} 条代表评论
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                数据更新时间
              </h2>
              <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                最新评论日期：{formatDate(latestReviewDate)}
              </div>
              <div className="mt-2 text-sm text-slate-400 dark:text-slate-500">
                当前 API：api.chenchangchao.com
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function Select({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-cyan-400"
    >
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function MetricCard({
  icon,
  label,
  value,
  highlight = false
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-3xl border p-5 shadow-sm",
        highlight
          ? "border-red-200 bg-red-50 dark:border-red-400/30 dark:bg-red-500/10"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70"
      ].join(" ")}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-cyan-700 dark:bg-slate-800 dark:text-cyan-300">
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-950 dark:text-white">
        {value.toLocaleString()}
      </div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
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

function SmallStat({
  label,
  value
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
      <div className="font-semibold text-slate-950 dark:text-white">{value}</div>
      <div className="mt-1">{label}</div>
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
