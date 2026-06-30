import {
  generate8DReportByAgent,
  getAgentClusters,
  sendMarkdownReportFileToFeishu
} from "@/lib/server/voc-agent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function cleanText(text: string) {
  return text.replace(/\\n/g, "\n").trim();
}

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
      reportText = cleanText(report);
      clusterNameZh = await getClusterName(clusterKey);
    } else {
      const result = await generate8DReportByAgent(clusterKey);
      reportText = cleanText(result.report);
      clusterNameZh = result.cluster.cluster_name_zh;
    }

    const fileResult = await sendMarkdownReportFileToFeishu({
      clusterKey,
      clusterNameZh,
      markdown: reportText
    });

    return Response.json({
      ok: true,
      cluster_key: clusterKey,
      push_type: "markdown_file",
      file_result: fileResult
    });
  } catch (error) {
    return Response.json(
      {
        error: "feishu_file_push_failed",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
