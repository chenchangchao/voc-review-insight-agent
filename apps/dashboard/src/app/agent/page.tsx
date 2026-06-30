import { AgentWorkbenchClient } from "@/components/AgentWorkbenchClient";
import { getClusters } from "@/lib/api";

export default async function AgentPage() {
  const clustersResult = await getClusters();

  return <AgentWorkbenchClient clusters={clustersResult.data} />;
}
