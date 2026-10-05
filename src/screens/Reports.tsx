import { useMemo, useState } from "react";
import { useApp } from "../store";
import { Amount, Badge, Button, Card, EmptyState, Progress, SectionTitle, Segmented } from "../components/ui";
import { AreaSpark, Bars, Donut, Legend, Ring } from "../components/Charts";
import { Icon } from "../components/Icons";
import { bankViews, debtViews, kindBreakdown, monthlySeries, totals } from "../lib/stats";
import { DEBT_KINDS, type DebtKind } from "../types";
import { humanMoney, percent, toFaDigits } from "../lib/format";
import {
  currentJalaliMonthKey,
  isoJalaliMonthKey,
  isoToJalaliText,
  jalaliMonthKeyOffset,
  monthKeyLabel,
} from "../lib/jalali";
import { downloadFile } from "../lib/storage";

type Period = "month" | "3m" | "6m" | "year";

export default function Reports() {
  const { vault, settings, notify } = useApp();
  const [period, setPeriod] = useState<Period>("month");

  const views = useMemo(() => debtViews(vault!), [vault]);
  const banks = useMemo(() => bankViews(vault!, views), [vault, views]);
  const sum = useMemo(() => totals(vault!, views), [vault, views]);
  const series = useMemo(() => monthlySeries(vault!, 12), [vault]);
  const kinds = useMemo(() => kindBreakdown(views), [views]);

  const monthsBack = period === "month" ? 1 : period === "3m" ? 3 : period === "6m" ? 6 : 12;
  const keys = useMemo(
    () => Array.from({ length: monthsBack }, (_, i) => jalaliMonthKeyOffset(monthsBack - 1 - i)),
    [monthsBack]
  );
  const paidInPeriod = useMemo(
    () =>
      (vault?.payments || [])
        .filter((p) => keys.includes(isoJalaliMonthKey(p.date)))
        .reduce((s, p) => s + p.amount, 0),
    [vault, keys]
  );

  const bankDonut = banks
    .filter((b) => b.remaining > 0)
    .map((b) => ({ label: b.bank.name, value: b.remaining, color: b.bank.color }));

  const paidByBank = banks
    .map((b) => ({
      label: b.bank.name,
      value: (vault?.payments || [])
        .filter((p) => p.bankId === b.bank.id && keys.includes(isoJalaliMonthKey(p.date)))
        .reduce((s, p) => s + p.amount, 0),
      color: b.bank.color,
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  const exportReport = () => {
    const rows = [
      ["گزارش مالی شخصی — " + monthKeyLabel(currentJalaliMonthKey())],
      [],
      ["بانک", "واریز لازم این ماه", "بدهی باقی‌مانده", "بدهی فعال", "نزدیک‌ترین سررسید", "پرداخت این ماه"],
      ...banks.map((b) => [
        b.bank.name,
        String(b.monthlyDue),
        String(b.remaining),
        String(b.activeDebts),
        b.nextDueDate ? isoToJalaliText(b.nextDueDate) : "—",
        String(b.paidThisMonth),
      ]),
      [],
      ["جمع واریز لازم", String(sum.monthlyDue)],
      ["جمع بدهی باقی‌مانده", String(sum.remaining)],
      ["پرداخت‌شده این ماه", String(sum.paidThisMonth)],
      [],
      ["جزئیات بدهی‌ها"],
      ["عنوان", "بانک", "نوع", "وضعیت", "مبلغ قسط", "کارمزد", "تعداد", "پرداخت‌شده", "مانده", "سررسید بعدی"],
      ...views.map((d) => [
        d.title,
        d.bank?.name || "",
        DEBT_KINDS[d.kind],
        d.effectiveStatus,
        String(d.installment),
        String(d.fee),
        `${d.paidCount}/${d.count}`,
        String(d.remainingAmount),
        d.nextDue ? isoToJalaliText(d.nextDue) : "—",
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile("pf-report.csv", csv, "text/csv");
    notify("گزارش CSV دانلود شد", "ok");
  };

  const print = () => window.print();

  if (!vault?.debts.length)
    return (
      <Card>
        <EmptyState
          icon="chart"
          title="گزارشی برای نمایش نیست"
          desc="پس از ثبت بانک‌ها و بدهی‌ها، گزارش دقیق اقساط ماهانه و مانده بدهی در همین صفحه ساخته می‌شود."
        />
      </Card>
    );

  return (
    <div className="space-y-5">
      {/* ---------- خلاصه اجرایی ---------- */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand2/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionTitle
              icon="chart"
              title="گزارش مالی شخصی"
              sub={`${settings?.ownerName ? `${settings.ownerName} عزیز، ` : ""}خلاصه وضعیت در ${monthKeyLabel(
                currentJalaliMonthKey()
              )}`}
            />
            <ul className="space-y-2 text-sm">
              <li className="flex flex-wrap items-center gap-2">
                <Icon name="bank" size={16} className="text-brand" />
                در این ماه باید
                <Amount value={sum.monthlyDue} className="text-base" />
                به
                <span className="font-bold">{toFaDigits(String(banks.filter((b) => b.monthlyDue > 0).length))}</span>
                حساب واریز کنید.
              </li>
              <li className="flex flex-wrap items-center gap-2">
                <Icon name="wallet" size={16} className="text-warn" />
                مانده کل بدهی:
                <Amount value={sum.remaining} className="text-base" />
                <span className="text-[11px] text-muted">
                  (حدود {humanMoney(sum.remaining, settings?.digits ?? "fa")})
                </span>
              </li>
              <li className="flex flex-wrap items-center gap-2">
                <Icon name="check" size={16} className="text-ok" />
                پرداخت‌شده در دوره انتخابی:
                <Amount value={paidInPeriod} className="text-base" />
              </li>
            </ul>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Ring value={sum.progressAll} size={104} label={percent(sum.plannedTotal - sum.remaining, sum.plannedTotal, settings?.digits ?? "fa")} />
            <div className="flex gap-2">
              <Button variant="soft" className="px-3 py-1.5 text-xs" icon="download" onClick={exportReport}>
                خروجی CSV
              </Button>
              <Button variant="soft" className="px-3 py-1.5 text-xs" icon="file" onClick={print}>
                چاپ
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: "month", label: "این ماه" },
            { value: "3m", label: "۳ ماه" },
            { value: "6m", label: "۶ ماه" },
            { value: "year", label: "یک سال" },
          ]}
        />
        <Badge tone="brand">{monthsLabel(period)}</Badge>
      </div>

      {/* ---------- جدول اصلی: واریز هر بانک ---------- */}
      <Card>
        <SectionTitle
          icon="bank"
          title="مبلغ دقیق واریزی به هر بانک"
          sub="این جدول همان چیزی است که برای برنامه‌ریزی ماهانه نیاز دارید"
        />
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[640px] text-right text-xs">
            <thead className="text-[11px] text-muted">
              <tr className="border-b border-line">
                <th className="pb-2 font-bold">بانک / بستانکار</th>
                <th className="pb-2 font-bold">واریز لازم</th>
                <th className="pb-2 font-bold">سهم</th>
                <th className="pb-2 font-bold">مانده بدهی</th>
                <th className="pb-2 font-bold">نزدیک‌ترین سررسید</th>
                <th className="pb-2 font-bold">پرداخت دوره</th>
              </tr>
            </thead>
            <tbody>
              {banks.map((b) => (
                <tr key={b.bank.id} className="border-b border-line/60 last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.bank.color }} />
                      <span className="font-bold">{b.bank.name}</span>
                      <span className="num text-[10px] text-muted">
                        {toFaDigits(String(b.activeDebts))} بدهی
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    {b.monthlyDue > 0 ? <Amount value={b.monthlyDue} className="text-xs" /> : <Badge tone="ok">—</Badge>}
                  </td>
                  <td className="w-28 py-3">
                    <Progress value={b.share} tone={`linear-gradient(90deg,${b.bank.color},var(--c-brand2))`} />
                    <span className="num mt-1 block text-[10px] text-muted">{percent(b.share, 100, settings?.digits ?? "fa")}</span>
                  </td>
                  <td className="py-3">
                    <Amount value={b.remaining} className="text-xs text-muted" />
                  </td>
                  <td className="num py-3 text-muted">
                    {b.nextDueDate ? isoToJalaliText(b.nextDueDate) : "—"}
                  </td>
                  <td className="py-3">
                    <span className="num font-bold text-ok">
                      {humanMoney(
                        (vault?.payments || [])
                          .filter((p) => p.bankId === b.bank.id && keys.includes(isoJalaliMonthKey(p.date)))
                          .reduce((s, p) => s + p.amount, 0),
                        settings?.digits ?? "fa"
                      )}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-line">
                <td className="py-3 font-extrabold">جمع کل</td>
                <td className="py-3">
                  <Amount value={sum.monthlyDue} className="text-xs" />
                </td>
                <td className="py-3 text-muted">۱۰۰٪</td>
                <td className="py-3">
                  <Amount value={sum.remaining} className="text-xs" />
                </td>
                <td className="py-3" />
                <td className="py-3">
                  <span className="num font-extrabold text-ok">{humanMoney(paidInPeriod, settings?.digits ?? "fa")}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ---------- نمودارها ---------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle icon="trend" title="روند ۱۲ ماه پرداخت" sub="مجموع واریزی‌های ثبت‌شده" />
          <AreaSpark values={series.map((s) => s.paid)} height={90} />
          <div className="mt-3">
            <Bars data={series.slice(-6).map((s) => ({ label: s.label, value: s.paid }))} format={(n) => humanMoney(n, settings?.digits ?? "fa")} height={120} />
          </div>
        </Card>
        <Card>
          <SectionTitle icon="wallet" title="تفکیک بدهی باقی‌مانده" sub="سهم هر بانک از کل بدهی" />
          <div className="flex flex-wrap items-center gap-5">
            <Donut
              data={bankDonut}
              center={{ top: humanMoney(sum.remaining, settings?.digits ?? "fa"), bottom: "مانده کل" }}
            />
            <Legend data={bankDonut} format={(n) => humanMoney(n, settings?.digits ?? "fa")} />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle icon="card" title="پرداخت‌شده به هر بانک" sub="در دوره انتخابی" />
          {paidByBank.length ? (
            <ul className="space-y-3">
              {paidByBank.map((b) => (
                <li key={b.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold">{b.label}</span>
                    <span className="num text-muted">{humanMoney(b.value, settings?.digits ?? "fa")}</span>
                  </div>
                  <Progress value={(b.value / (paidByBank[0].value || 1)) * 100} tone={`linear-gradient(90deg,${b.color},var(--c-brand))`} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="card" title="در این دوره پرداختی ثبت نشده" />
          )}
        </Card>
        <Card>
          <SectionTitle icon="receipt" title="مانده بر اساس نوع بدهی" sub="وام، چک، اقساط و قرض" />
          <div className="flex flex-wrap items-center gap-5">
            <Donut
              data={kinds.map((k) => ({ ...k, label: DEBT_KINDS[k.label as DebtKind] || k.label }))}
              size={150}
              center={{ top: toFaDigits(String(sum.activeCount)), bottom: "بدهی فعال" }}
            />
            <Legend
              data={kinds.map((k) => ({ ...k, label: DEBT_KINDS[k.label as DebtKind] || k.label }))}
              format={(n) => humanMoney(n, settings?.digits ?? "fa")}
            />
          </div>
        </Card>
      </div>

      {/* ---------- پیش‌بینی ---------- */}
      <Card>
        <SectionTitle icon="target" title="پیش‌بینی و تحلیل" sub="بر اساس داده‌های ثبت‌شده شما" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Insight
            icon="clock"
            label="میانگین ماهانه لازم"
            value={humanMoney(sum.monthlyDue, settings?.digits ?? "fa")}
            desc="برای تسویه همه اقساط فعال"
          />
          <Insight
            icon="calendar"
            label="مدت تسویه کامل"
            value={
              sum.monthlyDue > 0
                ? `${toFaDigits(String(Math.ceil(sum.remaining / sum.monthlyDue)))} ماه`
                : "—"
            }
            desc="در صورت پرداخت منظم اقساط"
          />
          <Insight
            icon="wallet"
            label="کل پرداخت آینده"
            value={humanMoney(sum.remaining, settings?.digits ?? "fa")}
            desc="مانده تمام اقساط فعال"
          />
          <Insight
            icon="trend"
            label="میانگین پرداخت واقعی"
            value={humanMoney(
              series.filter((s) => s.paid > 0).length
                ? series.reduce((s, x) => s + x.paid, 0) / series.filter((s) => s.paid > 0).length
                : 0,
              settings?.digits ?? "fa"
            )}
            desc="میانگین ۱۲ ماه اخیر"
          />
        </div>
      </Card>
    </div>
  );
}

function Insight({
  icon,
  label,
  value,
  desc,
}: {
  icon: "clock" | "calendar" | "wallet" | "trend";
  label: string;
  value: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface2/40 p-3.5">
      <div className="flex items-center gap-2 text-[11px] font-bold text-muted">
        <Icon name={icon} size={14} className="text-brand" />
        {label}
      </div>
      <p className="num mt-1.5 text-sm font-extrabold">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted">{desc}</p>
    </div>
  );
}

function monthsLabel(p: Period) {
  return p === "month" ? "دوره: ماه جاری" : p === "3m" ? "دوره: ۳ ماه اخیر" : p === "6m" ? "دوره: ۶ ماه اخیر" : "دوره: ۱۲ ماه اخیر";
}
