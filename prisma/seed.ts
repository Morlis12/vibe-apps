import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const rand = mulberry32(20260917);
  const today = new Date(2026, 8, 17);
  today.setHours(0, 0, 0, 0);

  // 90 jours de trafic + perfs (même générateur que le dashboard mock)
  const metrics = [];
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const wave = Math.sin((89 - i) / 9) * 0.5 + 0.5;
    const spike = rand() > 0.93 ? 1.6 : 1;
    const requests = Math.round((4200 + wave * 5200 + rand() * 1800) * spike);
    const latencyP95 = Math.round(
      120 + wave * 90 + rand() * 60 + (spike > 1 ? 180 : 0)
    );
    const errors = Math.round(rand() * 22 + (spike > 1 ? 45 : 0));
    const label = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
    metrics.push({ date, label, requests, latencyP95, errors });
  }

  // Upsert jour par jour (idempotent)
  for (const m of metrics) {
    await prisma.dailyMetric.upsert({
      where: { date: m.date },
      update: {
        label: m.label,
        requests: m.requests,
        latencyP95: m.latencyP95,
        errors: m.errors,
      },
      create: m,
    });
  }

  const endpoints = [
    { method: "GET", route: "GET /api/v1/search", requests: 184200, share: 92, avgLatency: 38, successRate: 99.98 },
    { method: "POST", route: "POST /api/v1/orders", requests: 148100, share: 74, avgLatency: 121, successRate: 99.91 },
    { method: "GET", route: "GET /api/v1/users/:id", requests: 122400, share: 61, avgLatency: 64, successRate: 99.95 },
    { method: "POST", route: "POST /api/v1/webhooks", requests: 86300, share: 43, avgLatency: 210, successRate: 99.72 },
    { method: "GET", route: "GET /api/v1/reports", requests: 56100, share: 28, avgLatency: 342, successRate: 99.64 },
  ];

  for (const e of endpoints) {
    await prisma.endpointStat.upsert({
      where: { route: e.route },
      update: e,
      create: e,
    });
  }

  const count = await prisma.dailyMetric.count();
  const epCount = await prisma.endpointStat.count();
  console.log(`Seed OK: ${count} daily_metrics, ${epCount} endpoint_stats`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
