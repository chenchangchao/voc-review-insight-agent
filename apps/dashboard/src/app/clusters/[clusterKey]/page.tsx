import Link from "next/link";
import { ClusterDetailClient } from "@/components/ClusterDetailClient";
import { getClusterReviews, getClusters } from "@/lib/api";

export default async function ClusterDetailPage({
  params
}: {
  params: Promise<{ clusterKey: string }>;
}) {
  const { clusterKey } = await params;

  const [clustersResult, reviewsResult] = await Promise.all([
    getClusters(),
    getClusterReviews(clusterKey, 20)
  ]);

  const cluster = clustersResult.data.find(
    (item) => item.cluster_key === clusterKey
  );

  if (!cluster) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-950 dark:bg-slate-950 dark:text-white">
        <p>Cluster not found.</p>
        <Link href="/" className="mt-4 inline-block text-cyan-600 dark:text-cyan-300">
          返回首页
        </Link>
      </main>
    );
  }

  return <ClusterDetailClient cluster={cluster} reviews={reviewsResult.data} />;
}
