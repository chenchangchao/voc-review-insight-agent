"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { marked, Renderer } from "marked";
import {
  Bot,
  Clipboard,
  ClipboardCheck,
  FileText,
  Lightbulb,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  Sparkles
} from "lucide-react";
import type { Cluster } from "@/lib/api";
import { issueCategoryLabel, productLineLabel } from "@/lib/utils";

type Props = {
  clusters: Cluster[];
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const EXAMPLE_QUESTIONS = [
  {
    title: "标准 8D 报告",
    badge: "完整报告",
    question: "基于当前问题簇生成完整 8D 报告草稿，突出 VOC 证据、可能根因和纠正预防措施。"
  },
  {
    title: "售后遏制方案",
    badge: "短期动作",
    question: "请重点分析这个问题簇的 D3 临时遏制措施，给出客服、售后和质检团队可以立即执行的动作。"
  },
  {
    title: "工程根因假设",
    badge: "D4 分析",
    question: "围绕 D4 根因分析，区分 VOC 事实和待验证假设，并列出硬件、固件、制造和用户场景的验证方法。"
  },
  {
    title: "管理层摘要",
    badge: "一页总结",
    question: "生成适合发给管理层的 8D 摘要，包含问题影响、严重度、当前证据、建议优先级和下一步决策点。"
  }
];

const AGENT_STEPS = ["Planner", "Tools", "Evidence", "Report"];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanMarkdown(markdown: string) {
  return markdown
    .replace(/\\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*```(?:markdown|md|text)?\s*$/i.test(line))
    .join("\n")
    .trim();
}

function renderMarkdown(markdown: string) {
  const renderer = new Renderer();
  renderer.html = ({ text }) => escapeHtml(text);

  return marked.parse(cleanMarkdown(markdown), {
    async: false,
    breaks: true,
    gfm: true,
    renderer
  });
}

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
  const [question, setQuestion] = useState(EXAMPLE_QUESTIONS[0].question);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [sendingFeishu, setSendingFeishu] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  const selectedCluster = useMemo(() => {
    return clusters.find((item) => item.cluster_key === clusterKey);
  }, [clusters, clusterKey]);

  const reportHtml = useMemo(() => {
    return report ? renderMarkdown(report) : "";
  }, [report]);

  function selectExample(questionText: string) {
    setQuestion(questionText);
    setMessage("");
  }

  async function generateReport() {
    if (!clusterKey) return;

    setLoading(true);
    setMessage("");
    setReport("");
    setEvidence("");
    setThread([]);

    try {
      const res = await fetch("/api/agent/8d", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clusterKey,
          question
        })
      });

      const data = await safeReadResponse(res);

      if (!res.ok) {
        throw new Error(data.message || "生成失败");
      }

      setReport(cleanMarkdown(data.report || ""));
      setEvidence(data.evidence || "");
      setThread([
        {
          id: Date.now(),
          role: "user",
          content: question.trim() || "生成标准 8D 报告草稿。"
        }
      ]);
      setMessage("8D 报告已生成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function askFollowUp() {
    const nextQuestion = followUpQuestion.trim();
    if (!clusterKey || !report || !nextQuestion) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: nextQuestion
    };

    setThread((items) => [...items, userMessage]);
    setFollowUpQuestion("");
    setFollowUpLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/agent/8d", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clusterKey,
          question: nextQuestion,
          previousReport: report,
          mode: "follow_up"
        })
      });

      const data = await safeReadResponse(res);

      if (!res.ok) {
        throw new Error(data.message || "追问失败");
      }

      setThread((items) => [
        ...items,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: cleanMarkdown(data.report || "")
        }
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setThread((items) => items.filter((item) => item.id !== userMessage.id));
    } finally {
      setFollowUpLoading(false);
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

  async function sendToEmail() {
    if (!clusterKey || !report || !email.trim()) return;

    setSendingEmail(true);
    setMessage("");

    try {
      const res = await fetch("/api/agent/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clusterKey,
          report,
          email: email.trim()
        })
      });

      const data = await readResponseSafely(res);

      if (!res.ok) {
        throw new Error(data.message || "邮件推送失败");
      }

      setMessage("8D 报告已发送到邮箱。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSendingEmail(false);
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

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
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

            <div className="mt-5">
              <label
                htmlFor="agent-question"
                className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                <Sparkles className="h-4 w-4 text-cyan-500" />
                分析问题
              </label>
              <textarea
                id="agent-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={5}
                placeholder="例如：请重点分析 D4 根因和 D5 永久纠正措施。"
                className="mt-2 w-full resize-y rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

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

            <div className="mt-5">
              <label
                htmlFor="agent-email"
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                邮箱推送
              </label>
              <input
                id="agent-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={sendToEmail}
                disabled={sendingEmail || !report || !email.trim()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                {sendingEmail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {sendingEmail ? "发送中..." : "发送到邮箱"}
              </button>
            </div>

            {message ? (
              <div className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                {message}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
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

            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              {AGENT_STEPS.map((step, index) => {
                const active = loading || report || evidence;
                return (
                  <div
                    key={step}
                    className={[
                      "rounded-xl border px-3 py-2 text-xs font-semibold",
                      active
                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-700 dark:text-cyan-200"
                        : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400"
                    ].join(" ")}
                  >
                    <span className="mr-2 text-slate-400">{index + 1}</span>
                    {step}
                  </div>
                );
              })}
            </div>

            {report ? (
              <>
                <div
                  className="markdown-report min-h-[520px] rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700 dark:bg-slate-950/70 dark:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: reportHtml }}
                />

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-cyan-500" />
                    <h3 className="font-semibold text-slate-950 dark:text-white">
                      多轮追问
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    追问会带上当前问题簇、证据上下文和已有报告，不会覆盖主报告。
                  </p>

                  <div className="mt-4 space-y-3">
                    {thread.map((item) => (
                      <div
                        key={item.id}
                        className={[
                          "rounded-2xl border p-3 text-sm leading-6",
                          item.role === "user"
                            ? "border-cyan-400/30 bg-cyan-400/10 text-slate-800 dark:text-cyan-50"
                            : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        ].join(" ")}
                      >
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {item.role === "user" ? "Question" : "Agent"}
                        </div>
                        {item.role === "assistant" ? (
                          <div
                            className="markdown-report"
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(item.content)
                            }}
                          />
                        ) : (
                          item.content
                        )}
                      </div>
                    ))}

                    {followUpLoading ? (
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Agent 正在基于当前报告继续分析...
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <textarea
                      value={followUpQuestion}
                      onChange={(event) => setFollowUpQuestion(event.target.value)}
                      rows={2}
                      placeholder="继续追问：比如 D4 哪个根因最值得优先验证？"
                      className="min-h-20 flex-1 resize-y rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={askFollowUp}
                      disabled={followUpLoading || !followUpQuestion.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
                    >
                      {followUpLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      发送追问
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="min-h-[520px] rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                {loading
                  ? "Agent 正在调用工具并生成报告，请稍候..."
                  : "请选择一个问题簇，然后点击“生成 8D 报告”。"}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                Example Questions
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                点击典型问题可快速填充分析目标，Agent 会基于所选 Issue Cluster、代表评论和相似召回证据生成报告。
              </p>
            </div>
            <Lightbulb className="mt-1 h-5 w-5 text-cyan-500" />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {EXAMPLE_QUESTIONS.map((example) => (
              <button
                key={example.title}
                type="button"
                onClick={() => selectExample(example.question)}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-cyan-400/70 dark:hover:bg-cyan-400/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    {example.title}
                  </h3>
                  <span className="shrink-0 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-200">
                    {example.badge}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {example.question}
                </p>
              </button>
            ))}
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
