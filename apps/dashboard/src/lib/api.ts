const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.chenchangchao.com";

export type Metrics = {
  total_reviews: number;
  core_reviews: number;
  core_negative_reviews: number;
  embedded_reviews: number;
  issue_clusters: number;
  high_severity_clusters: number;
};

export type Cluster = {
  cluster_id: number;
  cluster_key: string;
  product_line: string;
  issue_category: string;
  cluster_name_en: string;
  cluster_name_zh: string;
  severity: number;
  representative_review_id: number;
  linked_reviews: number;
  avg_similarity: number;
  min_similarity: number;
  max_similarity: number;
  first_review_date: string;
  last_review_date: string;
  summary_zh: string;
  suggestion: string;
};

export type ClusterReview = {
  cluster_key: string;
  cluster_name_zh: string;
  issue_category: string;
  severity: number;
  review_id: number;
  similarity: number;
  marketplace: string;
  last_star: number;
  review_date: string;
  last_title: string;
  content_clean: string;
};

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    next: {
      revalidate: 60
    }
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function getHealth() {
  return fetchJson<{ status: string; db_time: string }>("/health");
}

export async function getMetrics() {
  return fetchJson<Metrics>("/metrics");
}

export async function getClusters() {
  return fetchJson<{ count: number; data: Cluster[] }>("/clusters");
}

export async function getClusterReviews(clusterKey: string, limit = 20) {
  return fetchJson<{ cluster_key: string; count: number; data: ClusterReview[] }>(
    `/clusters/${clusterKey}/reviews?limit=${limit}`
  );
}
