import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(
    Math.max(Number(searchParams.get("days") ?? "30") || 30, 7),
    90
  );

  const [metrics, endpoints] = await Promise.all([
    prisma.dailyMetric.findMany({
      orderBy: { date: "desc" },
      take: days,
    }),
    prisma.endpointStat.findMany({
      orderBy: { requests: "desc" },
    }),
  ]);

  // Remet dans l'ordre chronologique pour le graphique
  const series = [...metrics].reverse().map((m) => ({
    label: m.label,
    date: m.date,
    requests: m.requests,
    latency: m.latencyP95,
    errors: m.errors,
  }));

  const totalRequests = series.reduce((s, d) => s + d.requests, 0);
  const avgLatency = series.length
    ? Math.round(series.reduce((s, d) => s + d.latency, 0) / series.length)
    : 0;
  const totalErrors = series.reduce((s, d) => s + d.errors, 0);
  const errorRate = totalRequests
    ? Number(((totalErrors / totalRequests) * 100).toFixed(2))
    : 0;

  return NextResponse.json({
    days,
    series,
    endpoints: endpoints.map((e) => ({
      route: e.route,
      method: e.method,
      value: e.share,
      detail: `${e.avgLatency} ms · ${e.successRate.toLocaleString("fr-FR")} %`,
    })),
    kpis: { totalRequests, avgLatency, totalErrors, errorRate },
  });
}
