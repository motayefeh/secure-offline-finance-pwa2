import { useId } from "react";
import { cn } from "../utils/cn";

export interface Slice {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  data,
  size = 168,
  thickness = 18,
  center,
}: {
  data: Slice[];
  size?: number;
  thickness?: number;
  center?: { top: string; bottom?: string };
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-line)" strokeWidth={thickness} />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                style={{ transition: "stroke-dasharray .8s ease, stroke-dashoffset .8s ease" }}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      {center && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="num text-lg font-extrabold sm:text-xl">{center.top}</span>
          {center.bottom && <span className="mt-0.5 text-[11px] text-muted">{center.bottom}</span>}
        </div>
      )}
    </div>
  );
}

export function Legend({ data, format }: { data: Slice[]; format: (n: number) => string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ul className="min-w-0 flex-1 space-y-2.5">
      {data.map((d, i) => (
        <li key={i} className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold">{d.label}</span>
          <span className="num shrink-0 text-xs text-muted">
            {Math.round((d.value / total) * 100)}٪
          </span>
          <span className="num shrink-0 text-xs font-bold">{format(d.value)}</span>
        </li>
      ))}
      {data.length === 0 && <li className="text-xs text-muted">داده‌ای موجود نیست</li>}
    </ul>
  );
}

export function Bars({
  data,
  height = 140,
  format,
}: {
  data: { label: string; value: number }[];
  height?: number;
  format: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="num text-[10px] font-bold text-muted opacity-0 transition group-hover:opacity-100">
            {format(d.value)}
          </span>
          <div
            className="w-full rounded-t-lg brand-grad transition-all duration-700 ease-out"
            style={{
              height: `${Math.max(3, (d.value / max) * (height - 34))}px`,
              opacity: d.value ? 1 : 0.18,
            }}
            title={`${d.label}: ${format(d.value)}`}
          />
          <span className="truncate text-[10px] font-semibold text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function AreaSpark({
  values,
  height = 60,
  color = "var(--c-brand2)",
}: {
  values: number[];
  height?: number;
  color?: string;
}) {
  const gid = useId().replace(/:/g, "");
  const w = 100;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${i * step},${100 - (v / max) * 92}`);
  return (
    <svg viewBox={`0 0 100 100`} preserveAspectRatio="none" style={{ height }} className="w-full">
      <defs>
        <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {values.length > 1 && (
        <>
          <polygon points={`0,100 ${pts.join(" ")} 100,100`} fill={`url(#g${gid})`} />
          <polyline
            points={pts.join(" ")}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

export function Ring({
  value,
  size = 84,
  thickness = 9,
  label,
  className,
}: {
  value: number;
  size?: number;
  thickness?: number;
  label?: string;
  className?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const len = (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--c-brand)" />
            <stop offset="100%" stopColor="var(--c-brand2)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-line)" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={thickness}
          strokeDasharray={`${len} ${c - len}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray .9s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="num text-sm font-extrabold">{label ?? `${Math.round(value)}٪`}</span>
      </div>
    </div>
  );
}
