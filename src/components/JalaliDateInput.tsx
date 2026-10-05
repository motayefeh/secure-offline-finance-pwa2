import { useMemo } from "react";
import { J_MONTHS, isoToJalaali, jalaaliToIso, jalaaliMonthLength, todayJalaali } from "../lib/jalali";
import { toFaDigits } from "../lib/format";
import { Select } from "./ui";

export function JalaliDateInput({
  value,
  onChange,
  yearFrom,
  yearTo,
}: {
  value: string;
  onChange: (iso: string) => void;
  yearFrom?: number;
  yearTo?: number;
}) {
  const t = todayJalaali();
  const j = useMemo(() => isoToJalaali(value) || t, [value, t.jy, t.jm, t.jd]);
  const from = yearFrom ?? t.jy - 12;
  const to = yearTo ?? t.jy + 3;
  const years = Array.from({ length: to - from + 1 }, (_, i) => to - i);
  const days = Array.from({ length: jalaaliMonthLength(j.jy, j.jm) }, (_, i) => i + 1);

  const set = (jy: number, jm: number, jd: number) => {
    const ml = jalaaliMonthLength(jy, jm);
    onChange(jalaaliToIso(jy, jm, Math.min(jd, ml)));
  };

  const cls = "inp num px-2 py-2 text-center text-sm";
  return (
    <div className="grid grid-cols-[1.1fr_1.4fr_1fr] gap-2">
      <Select className={cls} value={j.jd} onChange={(e) => set(j.jy, j.jm, +e.target.value)} aria-label="روز">
        {days.map((d) => (
          <option key={d} value={d}>
            {toFaDigits(String(d))}
          </option>
        ))}
      </Select>
      <Select className={cls} value={j.jm} onChange={(e) => set(j.jy, +e.target.value, j.jd)} aria-label="ماه">
        {J_MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </Select>
      <Select className={cls} value={j.jy} onChange={(e) => set(+e.target.value, j.jm, j.jd)} aria-label="سال">
        {years.map((y) => (
          <option key={y} value={y}>
            {toFaDigits(String(y))}
          </option>
        ))}
      </Select>
    </div>
  );
}
