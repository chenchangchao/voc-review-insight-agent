"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Clipboard,
  ClipboardCheck,
  FileText,
  Loader2,
  Send
} from "lucide-react";
import type { Cluster } from "@/lib/api";
import { issueCategoryLabel, productLineLabel } from "@/lib/utils";

type Props = {
  clusters: Cluster[];
};

async function safeReadResponse(res: Response) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: "non_json_response",
      message: text.slice(0, 500)
    };
  }
}

export function AgentWorkbenchClient({ clusters }: Props) {
  const [clusterKey, setClusterKey] = useState(
    clusters[0]?.cluster_key || ""
  );
  const [report, setReport] = useState("");
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingFeishu, setSendingFeishu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  const selectedCluster = useMemo(() => {
    return clusters.find((item) => item.cluster_key === clusterKey);
  }, [clusters, clusterKey]);

  async function generateReport() {
    if (!clusterKey) return;

    setLoading(true);
    setMessage("");
    setReport("");
    setEvidence("");

    try {
      const res = await fetch("/api/agent/8d", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clusterKey
        })
      });

      const data = await safeReadResponse(res);

      if (!res.ok) {
        throw new Error(data.message || "生成失败");
      }

      setReport(data.report || "");
      setEvidence(data.evidence || "");
      setMessage("8D 报告已生成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function readResponseSafely(res: Response) {
    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch {
      return {
        error: "non_json_response",
        message: text.slice(0, 800)
      };
    }
  }

  async function sendToFeishu() {
    if (!clusterKey || !report) return;

    setSendingFeishu(true);
    setMessage("");

    try {
      const cardRes = await fetch("/api/agent/feishu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clusterKey,
          report
        })
      });

      const cardData = await readResponseSafely(cardRes);

      if (!cardRes.ok) {
        throw new Error(cardData.message || "飞书卡片推送失败");
      }

      setMessage("飞书卡片已推送，正在尝试发送 Markdown 附件...");

      const fileRes = await fetch("/api/agent/feishu-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clusterKey,
          report
        })
      });

      const fileData = await readResponseSafely(fileRes);

      if (!fileRes.ok) {
        setMessage(
          `飞书卡片已推送，但 Markdown 附件发送失败：${
            fileData.message || "未知错误"
          }`
        );
        return;
      }

      setMessage("飞书卡片和 Markdown 附件均已推送成功。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSendingFeishu(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <section className="mx-auto max-w-6xl px-6 py-8 pt-24">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-cyan-700 hover:text-cyan-600 dark:text-cyan-300"
          >
            ← 返回看板
          </Link>
        </div>

        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-700 dark:text-cyan-200">
            <Bot className="h-4 w-4" />
            VOC Quality Agent
          </div>

          <h1 className="text-3xl font-bold text-slate-950 dark:text-white">
            8D 报告 Agent 工作台
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Agent 会调用 VOC API 工具，读取指标、Issue Cluster、代表评论和 pgvector
            相似召回结果，再使用 DeepSeek 生成 8D 报告草稿，并支持一键推送飞书。
          </p>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
              选择问题簇
            </h2>

            <select
              value={clusterKey}
              onChange={(event) => setClusterKey(event.target.value)}
              className="mt-4 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {clusters.map((cluster) => (
                <option key={cluster.cluster_key} value={cluster.cluster_key}>
                  {cluster.cluster_name_zh}
                </option>
              ))}
            </select>

            {selectedCluster ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950/70">
                <div className="font-semibold text-slate-950 dark:text-white">
                  {selectedCluster.cluster_name_zh}
                </div>
                <div className="mt-2 text-slate-500 dark:text-slate-400">
                  {productLineLabel(selectedCluster.product_line)} ·{" "}
                  {issueCategoryLabel(selectedCluster.issue_category)} · severity{" "}
                  {selectedCluster.severity}
                </div>
                <div className="mt-2 text-slate-500 dark:text-slate-400">
                  代表评论：{selectedCluster.linked_reviews} 条 · 平均相似度：
                  {selectedCluster.avg_similarity.toFixed(4)}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={generateReport}
              disabled={loading || !clusterKey}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {loading ? "Agent 正在生成..." : "生成 8D 报告"}
            </button>

            <button
              type="button"
              onClick={sendToFeishu}
              disabled={sendingFeishu || !report}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
            >
              {sendingFeishu ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sendingFeishu ? "推送中..." : "推送到飞书"}
            </button>

            {message ? (
              <div className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                {message}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                  Agent 输出
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  DeepSeek 生成的 8D Markdown 草稿。
                </p>
              </div>

              {report ? (
                <button
                  type="button"
                  onClick={copyReport}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {copied ? (
                    <ClipboardCheck className="h-4 w-4" />
                  ) : (
                    <Clipboard className="h-4 w-4" />
                  )}
                  {copied ? "已复制" : "复制 Markdown"}
                </button>
              ) : null}
            </div>

            <div className="min-h-[520px] whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 font-mono text-sm leading-7 text-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
              {loading
                ? "Agent 正在调用工具并生成报告，请稍候..."
                : report || "请选择一个问题簇，然后点击“生成 8D 报告”。"}
            </div>
          </div>
        </section>

        {evidence ? (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
              Agent 使用的证据上下文
            </h2>
            <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-xs leading-6 text-slate-600 dark:bg-slate-950/70 dark:text-slate-400">
              {evidence}
            </pre>
          </section>
        ) : null}
      </section>
    </main>
  );
}
