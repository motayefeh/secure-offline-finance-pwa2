import { useMemo, useState } from "react";
import { useApp } from "../store";
import { Amount, Badge, Button, Card, EmptyState, Progress, SectionTitle } from "../components/ui";
import { Bars, Donut, Legend, Ring } from "../components/Charts";
import { Icon } from "../components/Icons";
import { PaymentModal } from "../components/PaymentModal";
import { bankViews, debtViews, monthlySeries, totals } from "../lib/stats";
import { humanMoney, percent, toFaDigits } from "../lib/format";
import { isoToJalaliText, monthKeyLabel, currentJalaliMonthKey } from "../lib/jalali";
import type { DebtView } from "../lib/stats";
import type { Tab } from "../components/Shell";

export default function Dashboard() {
  const { vault, settings } = useApp();
  const [payFor, setPayFor] = useState<DebtView | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [confirmDebt, setConfirmDebt] = useState<string | null>(null);

  const views = useMemo(() => debtViews(vault!), [vault]);
  const banks = useMemo(() => bankViews(vault!, views), [vault, views]);
  const sum = useMemo(() => totals(vault!, views), [vault, views]);
  const series = useMemo(() => monthlySeries(vault!, 6), [vault]);
  const mk = currentJalaliMonthKey();

  const donut = banks
    .filter((b) => b.remaining > 0)
    .map((b) => ({ label: b.bank.name, value: b.remaining, color: b.bank.color }));

  const openPay = (d?: DebtView) => {
    setPayFor(d || null);
    setPayOpen(true);
  };

  const alertItems = [...sum.overdue, ...sum.soon].slice(0, 4);

  const hasNothing = !vault?.banks.length && !vault?.debts.length;
  if (hasNothing)
    return (
      <div className="space-y-5">
        <Card>
          <EmptyState
            icon="bank"
            title="هنوز چیزی ثبت نکرده‌اید"
            desc="اول حساب‌های بانکی‌تان را اضافه کنید، سپس بدهی و اقساط هر بانک را ثبت کنید تا گزارش دقیق «چقدر باید واریز کنم» ساخته شود."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button icon="bank" onClick={() => (location.hash = "#banks")}>
                  افزودن بانک
                </Button>
                <Button variant="soft" icon="receipt" onClick={() => (location.hash = "#debts")}>
                  افزودن قسط
                </Button>
              </div>
            }
          />
        </Card>
        <QuickNav />
        <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} preset={payFor ? { debt: payFor } : null} />
      </div>
    );

  return (
    <div className="space-y-5">
      {/* ---------- کارت اصلی ---------- */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-brand/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold text-muted">
              جمع واریزی لازم در {monthKeyLabel(mk)}
            </p>
            <Amount value={sum.monthlyDue} size="xl" className="mt-1 block" />
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <Icon name="trend" size={14} className="text-ok" />
                پرداخت این ماه: <Amount value={sum.paidThisMonth} className="text-ink" />
              </span>
              <span className="flex items-center gap-1.5 text-muted">
                <Icon name="wallet" size={14} className="text-brand" />
                بدهی باقی‌مانده: <Amount value={sum.remaining} className="text-ink" />
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Ring value={sum.progressAll} size={92} label={percent(sum.plannedTotal - sum.remaining, sum.plannedTotal, settings?.digits ?? "fa")} />
            <div className="text-xs leading-6 text-muted">
              <p className="font-bold text-ink">پیشرفت تسویه</p>
              <p className="num">{toFaDigits(String(sum.activeCount))} بدهی فعال</p>
              <p className="num">{toFaDigits(String(sum.doneCount))} تسویه‌شده</p>
              <p className="num">{toFaDigits(String(sum.bankCount))} حساب</p>
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap gap-2">
          <Button icon="plus" onClick={() => openPay()}>
            ثبت پرداخت
          </Button>
          <Button variant="soft" icon="bank" onClick={() => (location.hash = "#banks")}>
            بانک‌ها
          </Button>
          <Button variant="soft" icon="chart" onClick={() => (location.hash = "#reports")}>
            گزارش کامل
          </Button>
        </div>
      </Card>

      {/* ---------- هشدار سررسید ---------- */}
      {alertItems.length > 0 && (
        <Card className="border-warn/30 bg-warn/[0.06]">
          <SectionTitle
            icon="alert"
            title="سررسیدهای نزدیک و معوق"
            sub="بر اساس تنظیم هشدار (۵ روز) و اقساط گذشته"
            action={
              <Badge tone={sum.overdue.length ? "bad" : "warn"}>
                {sum.overdue.length ? `${toFaDigits(String(sum.overdue.length))} قسط معوق` : "در حال هشدار"}
              </Badge>
            }
          />
          <ul className="space-y-2">
            {alertItems.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface2/50 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {d.title}
                    <span className="mr-2 text-[11px] font-normal text-muted">· {d.bank?.name}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {d.overdue ? (
                      <span className="font-bold text-bad">
                        {toFaDigits(String(Math.abs(d.nextDueDays)))} روز گذشته از سررسید (
                        {isoToJalaliText(d.nextDue)})
                      </span>
                    ) : (
                      <>
                        {toFaDigits(String(d.nextDueDays))} روز مانده · {isoToJalaliText(d.nextDue)}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Amount value={d.monthlyDue} className="text-sm" />
                  <Button
                    className="px-3 py-1.5 text-xs"
                    icon="check"
                    onClick={() => {
                      if (confirmDebt === d.id) {
                        openPay(d);
                        setConfirmDebt(null);
                      } else {
                        setConfirmDebt(d.id);
                        window.setTimeout(() => setConfirmDebt((c) => (c === d.id ? null : c)), 4000);
                      }
                    }}
                  >
                    {confirmDebt === d.id ? "مطمئنی؟ ثبت کن" : "ثبت پرداخت"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ---------- گزارش واریز هر بانک ---------- */}
      <Card>
        <SectionTitle
          icon="bank"
          title="واریزی این ماه به هر بانک"
          sub="دقیقاً چه مبلغی باید به کدام حساب واریز شود"
        />
        {banks.length === 0 ? (
          <EmptyState icon="bank" title="بانکی ثبت نشده" desc="از بخش بانک‌ها حساب‌هایتان را اضافه کنید." />
        ) : (
          <ul className="stagger space-y-3">
            {banks.map((b) => (
              <li key={b.bank.id} className="rounded-xl border border-line bg-surface2/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
                      style={{ background: b.bank.color }}
                    >
                      <Icon name="bank" size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{b.bank.name}</p>
                      <p className="num truncate text-[11px] text-muted">
                        {b.activeDebts ? `${toFaDigits(String(b.activeDebts))} بدهی فعال` : "بدهی فعال ندارند"}
                        {b.nextDueDate ? ` · سررسید ${isoToJalaliText(b.nextDueDate)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    {b.monthlyDue > 0 ? (
                      <Amount value={b.monthlyDue} className="text-base" />
                    ) : (
                      <Badge tone="ok">تسویه</Badge>
                    )}
                    <p className="num mt-0.5 text-[10px] text-muted">
                      پرداخت‌شده این ماه: {humanMoney(b.paidThisMonth, settings?.digits ?? "fa")}
                    </p>
                  </div>
                </div>
                {b.monthlyDue > 0 && (
                  <div className="mt-2.5">
                    <Progress value={b.share} tone={`linear-gradient(90deg,${b.bank.color},var(--c-brand2))`} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------- نمودارها ---------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle icon="chart" title="روند پرداخت ۶ ماه اخیر" sub="مجموع واریزی‌های ثبت‌شده در هر ماه" />
          <Bars
            data={series.map((s) => ({ label: s.label, value: s.paid }))}
            format={(n) => humanMoney(n, settings?.digits ?? "fa")}
          />
        </Card>
        <Card>
          <SectionTitle icon="wallet" title="سهم بانک‌ها از بدهی باقی‌مانده" sub="بر اساس مبلغ باقی‌مانده اقساط" />
          <div className="flex flex-wrap items-center gap-5">
            <Donut
              data={donut}
              center={{
                top: humanMoney(sum.remaining, settings?.digits ?? "fa"),
                bottom: "باقی‌مانده کل",
              }}
            />
            <Legend data={donut} format={(n) => humanMoney(n, settings?.digits ?? "fa")} />
          </div>
        </Card>
      </div>

      {/* ---------- اقساط بعدی ---------- */}
      <Card>
        <SectionTitle icon="calendar" title="نزدیک‌ترین اقساط" sub="مرتب‌شده بر اساس سررسید" />
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[520px] text-right text-xs">
            <thead className="text-[11px] text-muted">
              <tr className="border-b border-line">
                <th className="pb-2 font-bold">عنوان</th>
                <th className="pb-2 font-bold">بانک</th>
                <th className="pb-2 font-bold">سررسید</th>
                <th className="pb-2 font-bold">مانده قسط</th>
                <th className="pb-2 font-bold">مبلغ</th>
                <th className="pb-2 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {sum.nextUp.map((d) => (
                <tr key={d.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 pl-2 font-bold">{d.title}</td>
                  <td className="py-2.5 text-muted">{d.bank?.name}</td>
                  <td className="num py-2.5 text-muted">
                    {isoToJalaliText(d.nextDue)}
                    {d.overdue && <span className="mr-1 font-bold text-bad">(معوق)</span>}
                  </td>
                  <td className="num py-2.5">
                    {toFaDigits(String(d.remainingCount))} از {toFaDigits(String(d.count))}
                  </td>
                  <td className="py-2.5">
                    <Amount value={d.monthlyDue} className="text-xs" />
                  </td>
                  <td className="py-2.5">
                    <Button variant="soft" className="px-2 py-1 text-[11px]" onClick={() => openPay(d)}>
                      پرداخت
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <QuickNav />

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        preset={payFor ? { debt: payFor } : null}
      />

    </div>
  );
}

function QuickNav() {
  const items: { tab: Tab; label: string; icon: "bank" | "receipt" | "card" | "chart" | "sliders" }[] = [
    { tab: "banks", label: "بانک‌ها", icon: "bank" },
    { tab: "debts", label: "بدهی و اقساط", icon: "receipt" },
    { tab: "payments", label: "پرداخت‌ها", icon: "card" },
    { tab: "reports", label: "گزارش‌ها", icon: "chart" },
    { tab: "settings", label: "تنظیمات", icon: "sliders" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((x) => (
        <button
          key={x.tab}
          onClick={() => (location.hash = `#${x.tab}`)}
          className="glass flex items-center gap-2.5 rounded-2xl p-3.5 text-right transition hover:bg-surface2/70"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand">
            <Icon name={x.icon} size={17} />
          </span>
          <span className="text-xs font-bold">{x.label}</span>
        </button>
      ))}
    </div>
  );
}
