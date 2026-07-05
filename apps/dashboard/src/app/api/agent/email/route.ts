import {
  cleanAgentText,
  generate8DReportByAgent,
  getAgentClusters,
  parseEmailRecipients,
  sendAgentReportEmail
} from "@/lib/server/voc-agent";

export const dynamic = "force-dynamic";
// export const runtime = "nodejs";
export const maxDuration = 120;

async function getClusterName(clusterKey: string) {
  const clustersResult = await getAgentClusters();
  const cluster = clustersResult.data.find(
    (item) => item.cluster_key === clusterKey
  );

  return cluster?.cluster_name_zh || clusterKey;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const clusterKey = body.clusterKey;
    const report = body.report;
    const recipients = parseEmailRecipients(body.email || body.recipients, 3);

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
    let clusterNameZh = "";

    if (report && typeof report === "string") {
      reportText = cleanAgentText(report);
      clusterNameZh = await getClusterName(clusterKey);
    } else {
      const result = await generate8DReportByAgent(clusterKey);
      reportText = cleanAgentText(result.report);
      clusterNameZh = result.cluster.cluster_name_zh;
    }

    const safeName = clusterKey.replace(/[^a-zA-Z0-9_-]/g, "_");
    const emailResult = await sendAgentReportEmail({
      recipients,
      subject: `VOC 8D 报告草稿：${clusterNameZh}`,
      markdown: reportText,
      fileName: `8D_Report_${safeName}.md`
    });

    return Response.json({
      ok: true,
      cluster_key: clusterKey,
      push_type: "email",
      email_result: emailResult
    });
  } catch (error) {
    return Response.json(
      {
        error: "email_push_failed",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
