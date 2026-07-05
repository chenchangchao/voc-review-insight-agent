import {
  cleanAgentText,
  generate8DReportByAgent,
  getAgentClusters,
  parseEmailRecipients,
  sendAgentReportEmail
} from "@/lib/server/voc-agent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 240;

function getRequestSecret(request: Request, body?: Record<string, unknown>) {
  const url = new URL(request.url);
  const auth = request.headers.get("authorization") || "";

  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice("bearer ".length).trim();
  }

  return (
    request.headers.get("x-workflow-secret") ||
    request.headers.get("x-cron-secret") ||
    url.searchParams.get("secret") ||
    (typeof body?.secret === "string" ? body.secret : "")
  );
}

function assertWorkflowAuthorized(request: Request, body?: Record<string, unknown>) {
  const expected =
    process.env.EMAIL_WORKFLOW_SECRET || process.env.AGENT_WORKFLOW_SECRET;

  if (!expected) {
    throw new Error(
      "EMAIL_WORKFLOW_SECRET or AGENT_WORKFLOW_SECRET is required for scheduled email workflow"
    );
  }

  const actual = getRequestSecret(request, body);

  if (actual !== expected) {
    throw new Error("Invalid workflow secret");
  }
}

function parseClusterKeys(input: unknown) {
  if (!input) return [];

  const values = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/[,\n;]/)
      : [];

  return Array.from(
    new Set(
      values
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  );
}

async function resolveClusterKeys(input: unknown) {
  const explicitKeys = parseClusterKeys(input);

  if (explicitKeys.length > 0) {
    return explicitKeys;
  }

  const clustersResult = await getAgentClusters();
  const limit = Number(process.env.EMAIL_WORKFLOW_MAX_CLUSTERS || 3);

  return clustersResult.data
    .slice()
    .sort((a, b) => {
      if (b.severity !== a.severity) return b.severity - a.severity;
      return b.linked_reviews - a.linked_reviews;
    })
    .slice(0, Number.isFinite(limit) ? limit : 3)
    .map((cluster) => cluster.cluster_key);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    assertWorkflowAuthorized(request, body);

    const recipients = parseEmailRecipients(
      body.recipients || body.email || process.env.EMAIL_WORKFLOW_RECIPIENTS,
      10
    );
    const clusterKeys = await resolveClusterKeys(
      body.clusterKeys || process.env.EMAIL_WORKFLOW_CLUSTER_KEYS
    );

    if (clusterKeys.length === 0) {
      return Response.json(
        {
          error: "bad_request",
          message: "No cluster keys resolved for workflow"
        },
        { status: 400 }
      );
    }

    const reports = await Promise.all(
      clusterKeys.map(async (clusterKey) => {
        const result = await generate8DReportByAgent(clusterKey);

        return {
          clusterKey,
          clusterNameZh: result.cluster.cluster_name_zh,
          report: cleanAgentText(result.report)
        };
      })
    );

    const generatedAt = new Date().toISOString();
    const digest = [
      `# VOC 8D 定时报告`,
      "",
      `生成时间：${generatedAt}`,
      `问题簇数量：${reports.length}`,
      "",
      ...reports.flatMap((item, index) => [
        "---",
        "",
        `# ${index + 1}. ${item.clusterNameZh}`,
        "",
        `Cluster Key：${item.clusterKey}`,
        "",
        item.report
      ])
    ].join("\n");

    const emailResult = await sendAgentReportEmail({
      recipients,
      subject: `VOC 8D 定时报告（${reports.length} 个问题簇）`,
      markdown: digest,
      fileName: `VOC_8D_Workflow_${generatedAt.slice(0, 10)}.md`
    });

    return Response.json({
      ok: true,
      push_type: "email_workflow",
      cluster_keys: clusterKeys,
      recipients,
      email_result: emailResult
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("secret") ? 401 : 500;

    return Response.json(
      {
        error: "email_workflow_failed",
        message
      },
      { status }
    );
  }
}
