import { useMemo, useState } from "react";
import { useApp } from "../store";
import { Amount, Button, Card, EmptyState, IconButton, Input, SectionTitle, Segmented, Select, useConfirm } from "../components/ui";
import { Icon } from "../components/Icons";
import { PAY_METHODS, PAYMENT_KINDS, type Payment, type PaymentKind } from "../types";
import { debtViews } from "../lib/stats";
import { groupNumber, humanMoney, toFaDigits } from "../lib/format";
import {
  currentJalaliMonthKey,
  isoJalaliMonthKey,
  isoToJalaliText,
  isoToShortJalali,
  monthKeyLabel,
  jalaliMonthKeyOffset,
} from "../lib/jalali";
import { PaymentModal } from "../components/PaymentModal";
import { downloadFile } from "../lib/storage";
import { Bars } from "../components/Charts";

type Range = "month" | "3m" | "all";

export default function Payments() {
  const { vault, settings, removePayment, notify } = useApp();
  const { ask, node } = useConfirm();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<Range>("month");
  const [bankId, setBankId] = useState("");
  const [kind, setKind] = useState<PaymentKind | "">("");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Payment | null>(null);

  const views = useMemo(() => debtViews(vault!), [vault]);
  const debtById = useMemo(() => new Map(views.map((d) => [d.id, d])), [views]);
  const bankById = useMemo(() => new Map((vault?.banks || []).map((b) => [b.id, b])), [vault]);

  const series = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const key = jalaliMonthKeyOffset(i);
      const paid = (vault?.payments || [])
        .filter((p) => isoJalaliMonthKey(p.date) === key)
        .reduce((s, p) => s + p.amount, 0);
      arr.push({ label: monthKeyLabel(key).split(" ")[0], value: paid });
    }
    return arr;
  }, [vault]);

  const list = useMemo(() => {
    return (vault?.payments || [])
      .filter((p) => {
        if (bankId && p.bankId !== bankId) return false;
        if (kind && p.kind !== kind) return false;
        if (q.trim()) {
          const hay = `${p.note || ""} ${p.ref || ""} ${bankById.get(p.bankId)?.name || ""} ${
            p.debtId ? debtById.get(p.debtId)?.title || "" : ""
          }`;
          if (!hay.includes(q.trim())) return false;
        }
        if (range === "month") return isoJalaliMonthKey(p.date) === currentJalaliMonthKey();
        if (range === "3m") {
          for (let i = 0; i < 3; i++) if (isoJalaliMonthKey(p.date) === jalaliMonthKeyOffset(i)) return true;
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
  }, [vault, range, bankId, kind, q, bankById, debtById]);

  const sum = list.reduce((s, p) => s + p.amount, 0);

  const exportCsv = () => {
    const rows = [
      ["تاریخ شمسی", "تاریخ میلادی", "بانک", "بدهی", "نوع", "روش", "مبلغ", "پیگیری", "یادداشت"],
      ...list.map((p) => [
        isoToJalaliText(p.date),
        p.date,
        bankById.get(p.bankId)?.name || "",
        p.debtId ? debtById.get(p.debtId)?.title || "" : "—",
        PAYMENT_KINDS[p.kind],
        PAY_METHODS[p.method],
        String(p.amount),
        p.ref || "",
        p.note || "",
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile("pf-payments.csv", csv, "text/csv");
    notify("فایل CSV پرداخت‌ها دانلود شد", "ok");
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="sm:col-span-2">
          <SectionTitle icon="chart" title="پرداخت ۶ ماه اخیر" sub="مجموع واریزی‌های ثبت‌شده" />
          <Bars data={series} format={(n) => humanMoney(n, settings?.digits ?? "fa")} height={120} />
        </Card>
        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-[11px] text-muted">جمع فهرست فعلی</p>
            <Amount value={sum} size="lg" className="mt-1 block" />
            <p className="num mt-1 text-[11px] text-muted">{toFaDigits(String(list.length))} تراکنش</p>
          </div>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1 py-2 text-xs" icon="plus" onClick={() => setOpen(true)}>
              پرداخت جدید
            </Button>
            <IconButton icon="download" label="خروجی CSV" onClick={exportCsv} />
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle
          icon="card"
          title="تاریخچه پرداخت‌ها"
          sub="همه واریزی‌ها به تفکیک بانک و بدهی"
          action={
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: "month", label: "این ماه" },
                { value: "3m", label: "۳ ماه" },
                { value: "all", label: "همه" },
              ]}
            />
          }
        />

        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <div className="relative">
            <Input className="py-2 pr-9 text-xs" placeholder="جستجو…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Icon name="search" size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <Select className="py-2 text-xs" value={bankId} onChange={(e) => setBankId(e.target.value)}>
            <option value="">همه بانک‌ها</option>
            {vault?.banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select className="py-2 text-xs" value={kind} onChange={(e) => setKind(e.target.value as PaymentKind | "")}>
            <option value="">همه انواع</option>
            {Object.entries(PAYMENT_KINDS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon="card"
            title="پرداختی ثبت نشده"
            desc="پس از پرداخت هر قسط، آن را ثبت کنید تا گزارش‌ها دقیق بمانند."
            action={
              <Button icon="plus" onClick={() => setOpen(true)}>
                ثبت پرداخت
              </Button>
            }
          />
        ) : (
          <ul className="stagger divide-y divide-line/70">
            {list.map((p) => {
              const bank = bankById.get(p.bankId);
              const debt = p.debtId ? debtById.get(p.debtId) : undefined;
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                      style={{ background: bank?.color || "var(--c-brand)" }}
                    >
                      <Icon name={p.kind === "deposit" ? "wallet" : p.kind === "penalty" ? "alert" : "card"} size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {debt?.title || bank?.name || "—"}
                        <span className="mr-2 text-[11px] font-normal text-muted">{PAYMENT_KINDS[p.kind]}</span>
                      </p>
                      <p className="num truncate text-[11px] text-muted">
                        {isoToJalaliText(p.date, true)} · {PAY_METHODS[p.method]}
                        {p.ref ? ` · رسید ${p.ref}` : ""}
                      </p>
                      {p.note && <p className="truncate text-[11px] text-muted/80">📝 {p.note}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-left">
                      <Amount value={p.amount} className="text-sm" />
                      <p className="num text-[10px] text-muted">{isoToShortJalali(p.date)}</p>
                    </div>
                    <IconButton icon="pencil" label="ویرایش" onClick={() => setEdit({ ...p })} />
                    <IconButton
                      icon="trash"
                      label="حذف"
                      onClick={() =>
                        ask("حذف این پرداخت؟", "در صورت اتصال به قسط، شمارنده اقساط نیز کاهش می‌یابد.", () => {
                          removePayment(p.id);
                          notify("پرداخت حذف شد", "ok");
                        })
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="num mt-4 border-t border-line pt-3 text-[11px] text-muted">
          نمایش {toFaDigits(String(list.length))} تراکنش · جمع: {groupNumber(sum, settings?.digits ?? "fa")} {settings?.currency}
        </p>
      </Card>

      <PaymentModal open={open} onClose={() => setOpen(false)} preset={null} />
      {edit && (
        <PaymentModal key={edit.id} open onClose={() => setEdit(null)} preset={{ payment: edit }} />
      )}
      {node}
    </div>
  );
}


