/* تبدیل تاریخ جلالی <-> میلادی (الگوریتم jalaali) */

const div = (a: number, b: number) => ~~(a / b);
const mod = (a: number, b: number) => a - ~~(a / b) * b;

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
  2456, 3178,
];

function jalCal(jy: number) {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

export function jalaaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalCal(jy).leap === 1 ? 30 : 29;
}

export function toJalaali(gy: number, gm: number, gd: number) {
  return d2j(g2d(gy, gm, gd));
}

function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export function toGregorian(jy: number, jm: number, jd: number) {
  return d2g(j2d(jy, jm, jd));
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

export const J_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export interface JDate {
  jy: number;
  jm: number;
  jd: number;
}

export function todayJalaali(): JDate {
  const n = new Date();
  return toJalaali(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

/** yyyy-mm-dd میلادی -> جلالی */
export function isoToJalaali(iso: string): JDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return null;
  return toJalaali(+m[1], +m[2], +m[3]);
}

export function jalaaliToIso(jy: number, jm: number, jd: number): string {
  const g = toGregorian(jy, jm, jd);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${g.gy}-${p(g.gm)}-${p(g.gd)}`;
}

export function isoToJalaliText(iso: string, withWeekday = false): string {
  const j = isoToJalaali(iso);
  if (!j) return "—";
  const base = `${j.jd} ${J_MONTHS[j.jm - 1]} ${j.jy}`;
  if (!withWeekday) return base;
  const wd = new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(new Date(iso + "T12:00:00"));
  return `${wd} ${base}`;
}

export function isoToShortJalali(iso: string): string {
  const j = isoToJalaali(iso);
  if (!j) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${j.jy}/${p(j.jm)}/${p(j.jd)}`;
}

/** روزهای باقی‌مانده تا تاریخ میلادی iso */
export function daysUntil(iso: string): number {
  const target = new Date(iso + "T00:00:00").getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

/** نزدیک‌ترین سررسید آینده بر اساس روز ماه (۱ تا ۳۱ جلالی) */
export function nextDueIso(dueDay: number): string {
  const t = todayJalaali();
  const day = Math.min(Math.max(1, dueDay), 31);
  const ml = jalaaliMonthLength(t.jy, t.jm);
  if (t.jd < day) return jalaaliToIso(t.jy, t.jm, Math.min(day, ml));
  const nm = t.jm === 12 ? { jy: t.jy + 1, jm: 1 } : { jy: t.jy, jm: t.jm + 1 };
  return jalaaliToIso(nm.jy, nm.jm, Math.min(day, jalaaliMonthLength(nm.jy, nm.jm)));
}

export function currentJalaliMonthKey(): string {
  const t = todayJalaali();
  return `${t.jy}-${String(t.jm).padStart(2, "0")}`;
}

export function isoJalaliMonthKey(iso: string): string {
  const j = isoToJalaali(iso);
  if (!j) return "";
  return `${j.jy}-${String(j.jm).padStart(2, "0")}`;
}

/** کلید ماه جلالی برای n ماه قبل (0 = این ماه) */
export function jalaliMonthKeyOffset(offset: number): string {
  const t = todayJalaali();
  let jy = t.jy;
  let jm = t.jm - offset;
  while (jm <= 0) {
    jm += 12;
    jy -= 1;
  }
  return `${jy}-${String(jm).padStart(2, "0")}`;
}

export function monthKeyLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${J_MONTHS[+m - 1]} ${y}`;
}

export function todayIso(): string {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}
