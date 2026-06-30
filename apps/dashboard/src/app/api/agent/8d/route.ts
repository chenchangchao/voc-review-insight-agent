import { generate8DReportByAgent } from "@/lib/server/voc-agent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const clusterKey = body.clusterKey;

    if (!clusterKey || typeof clusterKey !== "string") {
      return Response.json(
        {
          error: "bad_request",
          message: "clusterKey is required"
        },
        {
          status: 400
        }
      );
    }

    const result = await generate8DReportByAgent(clusterKey);

    return Response.json({
      cluster_key: clusterKey,
      cluster_name_zh: result.cluster.cluster_name_zh,
      report: result.report,
      evidence: result.evidence,
      report_source: result.report_source,
      deepseek_error: "deepseek_error" in result ? result.deepseek_error : null
    });
  } catch (error) {
    return Response.json(
      {
        error: "agent_8d_failed",
        message: error instanceof Error ? error.message : String(error)
      },
      {
        status: 500
      }
    );
  }
}
