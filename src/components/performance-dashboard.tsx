"use client";

import { useMemo, useState } from "react";

type RangeKey = "7j" | "30j" | "90j";
type MetricKey = "requests" | "latency" | "errors";

type DataPoint = {
  label: string;
  requests: number;
  latency: number;
  errors: number;
};

// Générateur pseudo-aléatoire déterministe : mêmes données côté serveur
// et côté client, donc aucun risque de désynchronisation d'hydratation.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSeries(): DataPoint[] {
  const rand = mulberry32(20260917);
  const points: DataPoint[] = [];
  const today = new Date(2026, 8, 17);
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const wave = Math.sin((89 - i) / 9) * 0.5 + 0.5;
    const spike = rand() > 0.93 ? 1.6 : 1;
    const requests = Math.round((4200 + wave * 5200 + rand() * 1800) * spike);
    const latency = Math.round(120 + wave * 90 + rand() * 60 + (spike > 1 ? 180 : 0));
    const errors = Math.round(rand() * 22 + (spike > 1 ? 45 : 0));
    points.push({
      label: date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      requests,
      latency,
      errors,
    });
  }
  return points;
}

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "7j", label: "7 jours", days: 7 },
  { key: "30j", label: "30 jours", days: 30 },
  { key: "90j", label: "90 jours", days: 90 },
];

const METRICS: {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  soft: string;
  gradientId: string;
}[] = [
  {
    key: "requests",
    label: "Requêtes",
    unit: "req",
    color: "#22d3ee",
    soft: "rgba(34, 211, 238, 0.15)",
    gradientId: "area-cyan",
  },
  {
    key: "latency",
    label: "Latence p95",
    unit: "ms",
    color: "#c084fc",
    soft: "rgba(192, 132, 252, 0.15)",
    gradientId: "area-violet",
  },
  {
    key: "errors",
    label: "Erreurs",
    unit: "err",
    color: "#fb7185",
    soft: "rgba(251, 113, 133, 0.15)",
    gradientId: "area-rose",
  },
];

const ENDPOINTS = [
  { route: "GET /api/v1/search", value: 92, detail: "38 ms · 99,98 %" },
  { route: "POST /api/v1/orders", value: 74, detail: "121 ms · 99,91 %" },
  { route: "GET /api/v1/users/:id", value: 61, detail: "64 ms · 99,95 %" },
  { route: "POST /api/v1/webhooks", value: 43, detail: "210 ms · 99,72 %" },
  { route: "GET /api/v1/reports", value: 28, detail: "342 ms · 99,64 %" },
];

const W = 760;
const H = 280;
const PAD = { top: 16, right: 16, bottom: 30, left: 48 };

function smoothPath(values: number[], min: number, max: number): string {
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: PAD.left + (i / (values.length - 1)) * iw,
    y: PAD.top + ih - ((v - min) / span) * ih,
  }));
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} k`;
  return `${n}`;
}

export default function PerformanceDashboard() {
  const [range, setRange] = useState<RangeKey>("30j");
  const [metric, setMetric] = useState<MetricKey>("requests");
  const [hover, setHover] = useState<number | null>(null);

  const all = useMemo(() => buildSeries(), []);
  const days = RANGES.find((r) => r.key === range)!.days;
  const data = useMemo(() => all.slice(-days), [all, days]);
  const active = METRICS.find((m) => m.key === metric)!;
  const values = data.map((d) => d[metric]);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = Math.floor(min - (max - min) * 0.15);
  const hi = Math.ceil(max + (max - min) * 0.15);

  const line = useMemo(() => smoothPath(values, lo, hi), [values, lo, hi]);
  const area = `${line} L ${W - PAD.right},${H - PAD.bottom} L ${PAD.left},${H - PAD.bottom} Z`;

  const totalRequests = data.reduce((s, d) => s + d.requests, 0);
  const avgLatency = Math.round(data.reduce((s, d) => s + d.latency, 0) / data.length);
  const totalErrors = data.reduce((s, d) => s + d.errors, 0);
  const errorRate = ((totalErrors / totalRequests) * 100).toFixed(2);
  const uptime = (100 - (totalErrors / totalRequests) * 100).toFixed(2);

  const kpis = [
    { label: "Requêtes totales", value: formatCompact(totalRequests), delta: "+12,4 %", up: true },
    { label: "Latence p95 moy.", value: `${avgLatency} ms`, delta: "-8,1 %", up: true },
    { label: "Taux d'erreur", value: `${errorRate} %`, delta: "-0,3 pt", up: true },
    { label: "Disponibilité", value: `${uptime} %`, delta: "SLA 99,9 %", up: true },
  ];

  const gridTicks = [0, 1, 2, 3].map((i) => {
    const v = lo + ((hi - lo) / 3) * i;
    const y = PAD.top + (H - PAD.top - PAD.bottom) - (i / 3) * (H - PAD.top - PAD.bottom);
    return { v: Math.round(v), y };
  });

  const xFor = (i: number) =>
    PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right);
  const yFor = (v: number) =>
    PAD.top +
    (H - PAD.top - PAD.bottom) -
    ((v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);

  const hovered = hover !== null ? data[hover] : null;
  const tickEvery = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Halo décoratif */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-violet-600/15 via-fuchsia-500/5 to-transparent"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {/* En-tête */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
              Observabilité
            </p>
            <h1 className="mt-2 flex items-center gap-2.5 text-3xl font-bold tracking-tight sm:text-4xl">
              Performances de l&apos;application
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/15">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-4 w-4 text-emerald-400"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              Tous les systèmes sont opérationnels · mis à jour à l&apos;instant
            </p>
          </div>
          {/* Sélecteur de période */}
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  setRange(r.key);
                  setHover(null);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  range === r.key
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur transition-colors hover:border-zinc-700"
            >
              <p className="text-sm text-zinc-400">{kpi.label}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{kpi.value}</p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                <span aria-hidden>{kpi.up ? "▲" : "▼"}</span> {kpi.delta}
              </p>
            </div>
          ))}
        </div>

        {/* Graphique principal */}
        <div className="mt-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Trafic &amp; santé</h2>
              <p className="text-sm text-zinc-500">
                {data[0].label} → {data[data.length - 1].label}
              </p>
            </div>
            <div className="flex gap-2">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMetric(m.key)}
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    metric === m.key
                      ? "border-transparent bg-zinc-100 text-zinc-900"
                      : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-4">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="block h-auto w-full cursor-crosshair"
              role="img"
              aria-label={`Graphique ${active.label} sur ${days} jours`}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = W / rect.width;
                const x = (e.clientX - rect.left) * ratio;
                const i = Math.round(
                  ((x - PAD.left) / (W - PAD.left - PAD.right)) * (data.length - 1)
                );
                setHover(Math.max(0, Math.min(data.length - 1, i)));
              }}
              onMouseLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id="area-cyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="area-violet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="area-rose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="line-glow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#f0abfc" />
                </linearGradient>
              </defs>

              {/* Grille */}
              {gridTicks.map((t) => (
                <g key={t.v}>
                  <line
                    x1={PAD.left}
                    x2={W - PAD.right}
                    y1={t.y}
                    y2={t.y}
                    stroke="#27272a"
                    strokeDasharray="3 5"
                  />
                  <text x={PAD.left - 8} y={t.y + 4} textAnchor="end" fontSize="11" fill="#71717a">
                    {formatCompact(t.v)}
                  </text>
                </g>
              ))}

              {/* Axe X */}
              {data.map((d, i) =>
                i % tickEvery === 0 || i === data.length - 1 ? (
                  <text
                    key={`${d.label}-${i}`}
                    x={xFor(i)}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#71717a"
                  >
                    {d.label}
                  </text>
                ) : null
              )}

              {/* Zone + courbe */}
              <path d={area} fill={`url(#${active.gradientId})`} />
              <path
                d={line}
                fill="none"
                stroke="url(#line-glow)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Curseur de survol */}
              {hovered && hover !== null && (
                <g>
                  <line
                    x1={xFor(hover)}
                    x2={xFor(hover)}
                    y1={PAD.top}
                    y2={H - PAD.bottom}
                    stroke="#a1a1aa"
                    strokeDasharray="4 4"
                  />
                  <circle
                    cx={xFor(hover)}
                    cy={yFor(values[hover])}
                    r="5"
                    fill="#09090b"
                    stroke={active.color}
                    strokeWidth="2.5"
                  />
                </g>
              )}
            </svg>

            {/* Infobulle */}
            {hovered && hover !== null && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl border border-zinc-700 bg-zinc-950/95 px-3.5 py-2.5 text-center shadow-xl shadow-black/50 backdrop-blur"
                style={{
                  left: `${(xFor(hover) / W) * 100}%`,
                  top: 0,
                }}
              >
                <p className="text-xs text-zinc-400">{hovered.label}</p>
                <p className="text-lg font-bold" style={{ color: active.color }}>
                  {hovered[metric].toLocaleString("fr-FR")}{" "}
                  <span className="text-xs font-medium text-zinc-400">{active.unit}</span>
                </p>
              </div>
            )}
          </div>

          {/* Légende */}
          <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-xs text-zinc-500">
            <span>
              Min {formatCompact(min)} · Max {formatCompact(max)} {active.unit}
            </span>
            <span>Survolez le graphique pour inspecter chaque jour</span>
          </div>
        </div>

        {/* Endpoints */}
        <div className="mt-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur sm:p-6">
          <h2 className="text-lg font-semibold">Endpoints les plus sollicités</h2>
          <p className="text-sm text-zinc-500">Volume relatif et santé par route</p>
          <div className="mt-4 space-y-4">
            {ENDPOINTS.map((ep) => (
              <div key={ep.route}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <code className="truncate font-mono text-zinc-200">{ep.route}</code>
                  <span className="shrink-0 text-zinc-500">{ep.detail}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400"
                    style={{ width: `${ep.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
