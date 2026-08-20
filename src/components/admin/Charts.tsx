"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type Point = { label: string; value: number };

/**
 * Formatting is selected by name rather than by passing a callback, because
 * these charts are Client Components and a function prop cannot cross the
 * server/client boundary.
 */
export type NumberFormat = "plain" | "inr" | "compact";

function formatValue(v: number, kind: NumberFormat): string {
  switch (kind) {
    case "inr":
      return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    case "compact":
      return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
    default:
      return v.toLocaleString("en-IN");
  }
}

/**
 * Charts are hand-drawn SVG rather than a charting library: the shapes needed
 * here are simple, and a library would add far more bundle weight than the
 * ~120 lines below. All are pure SVG — no canvas, no layout thrash.
 */

export function AreaChart({
  data,
  format = "plain",
  height = 180,
  color = "var(--color-brand-500)",
}: {
  data: Point[];
  format?: NumberFormat;
  height?: number;
  color?: string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const W = 600;
  const H = height;
  const PAD = 8;

  const max = Math.max(...data.map((d) => d.value)) * 1.15 || 1;
  const step = (W - PAD * 2) / Math.max(data.length - 1, 1);

  const pts = data.map((d, i) => ({
    x: PAD + i * step,
    y: H - PAD - (d.value / max) * (H - PAD * 2),
    ...d,
  }));

  /* Catmull-Rom style smoothing: each segment gets control points derived
     from its neighbours, which avoids the kinks a plain polyline shows. */
  const path = pts
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(" ");

  const area = `${path} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label="Trend chart"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={H * f}
            y2={H * f}
            stroke="var(--color-line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {pts.map((p, i) => (
          <g key={p.label}>
            {hover === i && (
              <circle cx={p.x} cy={p.y} r="5" fill={color} stroke="white" strokeWidth="2.5" />
            )}
            {/* Invisible full-height hit area — far easier to hover than a dot. */}
            <rect
              x={p.x - step / 2}
              y={0}
              width={step}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>

      <div className="mt-1 flex justify-between px-1">
        {data.map((d, i) => (
          <span
            key={d.label}
            className={cn(
              "text-[10px] font-semibold transition-colors",
              hover === i ? "text-ink" : "text-ink-muted",
            )}
          >
            {d.label}
          </span>
        ))}
      </div>

      {hover !== null && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
          {data[hover].label} · {formatValue(data[hover].value, format)}
        </div>
      )}
    </div>
  );
}

export function BarChart({
  data,
  format = "plain",
  color = "var(--color-sky-ks)",
}: {
  data: Point[];
  format?: NumberFormat;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value)) || 1;

  return (
    <div className="flex h-44 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.label} className="group flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-bold text-ink opacity-0 transition-opacity group-hover:opacity-100">
            {formatValue(d.value, format)}
          </span>
          <div
            className="w-full rounded-t-md transition-[filter] group-hover:brightness-110"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: 4,
              backgroundColor: color,
            }}
          />
          <span className="text-[10px] font-semibold text-ink-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Donut with a centre label — used for category share. */
export function DonutChart({
  data,
  size = 168,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 60;
  const C = 2 * Math.PI * R;

  let offset = 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="Share by category">
        <g transform="rotate(-90 80 80)">
          {data.map((d) => {
            const len = (d.value / total) * C;
            const circle = (
              <circle
                key={d.label}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={d.color}
                strokeWidth="22"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return circle;
          })}
        </g>
        <text
          x="80"
          y="74"
          textAnchor="middle"
          className="fill-ink font-display text-[22px] font-extrabold"
        >
          {total}%
        </text>
        <text x="80" y="92" textAnchor="middle" className="fill-ink-muted text-[10px]">
          of orders
        </text>
      </svg>

      <ul className="space-y-1.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-ink-soft">{d.label}</span>
            <span className="ml-auto font-bold text-ink">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tiny inline trend line for stat cards. */
export function Sparkline({
  values,
  color = "var(--color-mint-500)",
}: {
  values: number[];
  color?: string;
}) {
  const max = Math.max(...values) || 1;
  const min = Math.min(...values);
  const range = max - min || 1;

  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 24 - ((v - min) / range) * 20;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 28" className="h-7 w-20" preserveAspectRatio="none" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
