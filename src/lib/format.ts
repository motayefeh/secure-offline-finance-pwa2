import type { Settings } from "../types";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFaDigits(input: string): string {
  return input.replace(/\d/g, (d) => FA_DIGITS[+d]);
}

export function groupNumber(n: number, digits: "fa" | "en" = "fa"): string {
  const safe = Number.isFinite(n) ? n : 0;
  const s = Math.abs(safe).toLocaleString("en-US");
  const out = (safe < 0 ? "-" : "") + s;
  return digits === "fa" ? toFaDigits(out) : out;
}

export function money(n: number, settings?: Pick<Settings, "digits" | "currency">): string {
  const digits = settings?.digits ?? "fa";
  const cur = settings?.currency ?? "تومان";
  return `${groupNumber(Math.round(n), digits)} ${cur}`;
}

export function plainNumber(n: number, digits: "fa" | "en" = "fa"): string {
  return groupNumber(n, digits);
}

/** «۱۰ میلیون و ۲۰۰ هزار تومان» — خواندن ساده مبالغ */
export function humanMoney(n: number, digits: "fa" | "en" = "fa"): string {
  const v = Math.abs(Math.round(n));
  const fa = digits === "fa";
  const units: [number, string][] = [
    [1_000_000_000, fa ? "میلیارد" : "B"],
    [1_000_000, fa ? "میلیون" : "M"],
    [1_000, fa ? "هزار" : "K"],
  ];
  for (const [size, label] of units) {
    if (v >= size) {
      const val = v / size;
      const txt = Number.isInteger(val) ? String(val) : val.toFixed(1);
      return `${fa ? toFaDigits(txt) : txt} ${label}`;
    }
  }
  return groupNumber(v, digits);
}

export function percent(part: number, total: number, digits: "fa" | "en" = "fa"): string {
  if (!total) return digits === "fa" ? "۰٪" : "0%";
  const p = Math.min(100, Math.max(0, (part / total) * 100));
  const txt = p >= 10 ? p.toFixed(0) : p.toFixed(1);
  return `${digits === "fa" ? toFaDigits(txt) : txt}٪`;
}

/** ماسک شماره کارت/حساب */
export function maskValue(v?: string, keep = 4): string {
  if (!v) return "—";
  const clean = v.replace(/\s+/g, "");
  if (clean.length <= keep) return clean;
  const tail = clean.slice(-keep);
  const head = clean.slice(0, clean.length - keep);
  return `${"•".repeat(Math.min(head.length, 12))}${toFaDigits(tail)}`;
}

export function groupCard(v?: string): string {
  if (!v) return "—";
  const c = v.replace(/\D/g, "");
  return toFaDigits(c.replace(/(.{4})/g, "$1 ").trim());
}

export function uid(prefix = "id"): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now().toString(36)}${rnd}`;
}

export function scorePassword(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 16 && score >= 4) score++;
  const labels = ["خیلی ضعیف", "ضعیف", "متوسط", "خوب", "قوی", "بسیار قوی", "فوق‌قوی"];
  const colors = ["#f43f5e", "#f43f5e", "#f59e0b", "#f59e0b", "#10b981", "#10b981", "#22d3ee"];
  return { score, label: labels[Math.min(score, 5)], color: colors[Math.min(score, 6)] };
}
