import { AgentWorkbenchClient } from "@/components/AgentWorkbenchClient";
import { getClusters } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const clustersResult = await getClusters();

  return <AgentWorkbenchClient clusters={clustersResult.data} />;
}
