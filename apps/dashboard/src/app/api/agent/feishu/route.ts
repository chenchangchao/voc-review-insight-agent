import {
  generate8DReportByAgent,
  getAgentClusters,
  sendFeishuInteractiveCard
} from "@/lib/server/voc-agent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function cleanText(text: string) {
  return text.replace(/\\n/g, "\n").trim();
}

function extractFeishuSummary(report: string) {
  const cleaned = cleanText(report);
  const marker = "飞书推送摘要";
  const idx = cleaned.indexOf(marker);

  if (idx >= 0) {
    return cleaned
      .slice(idx)
      .replace(/^#+\s*/gm, "")
      .replace(/\*\*/g, "")
      .slice(0, 900);
  }

  return cleaned
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*/g, "")
    .slice(0, 900);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const clusterKey = body.clusterKey;
    const report = body.report;

    if (!clusterKey || typeof clusterKey !== "string") {
      return Response.json(
        {
          error: "bad_request",
          message: "clusterKey is required"
        },
        { status: 400 }
      );
    }

    let reportText = "";
    let cluster = null;

    const clustersResult = await getAgentClusters();
    cluster =
      clustersResult.data.find((item) => item.cluster_key === clusterKey) ||
      null;

    if (!cluster) {
      return Response.json(
        {
          error: "cluster_not_found",
          message: `Cluster not found: ${clusterKey}`
        },
        { status: 404 }
      );
    }

    if (report && typeof report === "string") {
      reportText = cleanText(report);
    } else {
      const result = await generate8DReportByAgent(clusterKey);
      reportText = cleanText(result.report);
      cluster = result.cluster;
    }

    const summary = extractFeishuSummary(reportText);

    const cardResult = await sendFeishuInteractiveCard({
      clusterKey,
      clusterNameZh: cluster.cluster_name_zh,
      productLine: cluster.product_line,
      issueCategory: cluster.issue_category,
      severity: cluster.severity,
      linkedReviews: cluster.linked_reviews,
      avgSimilarity: cluster.avg_similarity,
      summary,
      reportUrl: `https://voc.chenchangchao.com/reports/8d/${clusterKey}`,
      detailUrl: `https://voc.chenchangchao.com/clusters/${clusterKey}`,
      apiUrl: `https://api.chenchangchao.com/clusters/${clusterKey}/reviews`
    });

    return Response.json({
      ok: true,
      cluster_key: clusterKey,
      push_type: "interactive_card",
      card_result: cardResult
    });
  } catch (error) {
    return Response.json(
      {
        error: "feishu_card_push_failed",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
