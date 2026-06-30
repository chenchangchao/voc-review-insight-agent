import { DashboardClient } from "@/components/DashboardClient";
import { getClusters, getHealth, getMetrics } from "@/lib/api";

export default async function HomePage() {
  const [health, metrics, clustersResult] = await Promise.all([
    getHealth(),
    getMetrics(),
    getClusters()
  ]);

  return (
    <DashboardClient
      health={health}
      metrics={metrics}
      clusters={clustersResult.data}
    />
  );
}
