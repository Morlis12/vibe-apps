import type { Metadata } from "next";
import PerformanceDashboard, {
  type DashboardEndpoint,
  type DashboardPoint,
} from "@/components/performance-dashboard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Tableau de bord · Performances",
  description:
    "Tableau de bord sombre de suivi des performances de l'application : trafic, latence, erreurs et disponibilité.",
};

export const dynamic = "force-dynamic";

async function getDashboardData(): Promise<{
  series: DashboardPoint[];
  endpoints: DashboardEndpoint[];
}> {
  try {
    const [metrics, stats] = await Promise.all([
      prisma.dailyMetric.findMany({ orderBy: { date: "asc" }, take: 90 }),
      prisma.endpointStat.findMany({ orderBy: { requests: "desc" } }),
    ]);

    if (metrics.length === 0) return { series: [], endpoints: [] };

    return {
      series: metrics.map((m) => ({
        label: m.label,
        requests: m.requests,
        latency: m.latencyP95,
        errors: m.errors,
      })),
      endpoints: stats.map((e) => ({
        route: e.route,
        value: e.share,
        detail: `${e.avgLatency} ms · ${e.successRate.toLocaleString("fr-FR")} %`,
      })),
    };
  } catch {
    // Base absente / non migrée au build : le composant utilisera ses données mock
    return { series: [], endpoints: [] };
  }
}

export default async function DashboardPage() {
  const { series, endpoints } = await getDashboardData();
  return (
    <PerformanceDashboard initialSeries={series} initialEndpoints={endpoints} />
  );
}
