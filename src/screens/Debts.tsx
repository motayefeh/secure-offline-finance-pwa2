import { useMemo, useState } from "react";
import { useApp } from "../store";
import { Amount, Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, Progress, SectionTitle, Segmented, Select, Textarea, useConfirm } from "../components/ui";
import { Icon } from "../components/Icons";
import { DEBT_KINDS, DEBT_STATUS, type Debt, type DebtKind, type DebtStatus } from "../types";
import { debtViews, type DebtView } from "../lib/stats";
import { humanMoney, percent, toFaDigits, uid } from "../lib/format";
import { isoToJalaliText, nextDueIso, todayIso } from "../lib/jalali";
import { PaymentModal } from "../components/PaymentModal";
import { JalaliDateInput } from "../components/JalaliDateInput";

type Filter = "all" | "active" | "done" | "overdue";

function blankDebt(bankId: string): Debt {
  return {
    id: uid("debt"),
    bankId,
    title: "",
    kind: "installment",
    status: "active",
    total: 0,
    installment: 0,
    count: 12,
    paidCount: 0,
    fee: 0,
    dueDay: 5,
    startDate: todayIso(),
    note: "",
    createdAt: Date.now(),
  };
}

export default function Debts() {
  const { vault, upsertDebt, removeDebt, notify } = useApp();
  const { ask, node } = useConfirm();
  const [editing, setEditing] = useState<Debt | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [q, setQ] = useState("");
  const [payFor, setPayFor] = useState<DebtView | null>(null);

  const views = useMemo(() => debtViews(vault!), [vault]);
  const filtered = views
    .filter((d) => {
      if (filter === "active") return d.effectiveStatus === "active";
      if (filter === "done") return d.effectiveStatus === "done";
      if (filter === "overdue") return d.overdue;
      return true;
    })
    .filter((d) => (d.title + (d.bank?.name || "")).includes(q.trim()));

  const sumActive = views
    .filter((d) => d.effectiveStatus === "active")
    .reduce((s, d) => ({ due: s.due + d.monthlyDue, rem: s.rem + d.remainingAmount }), { due: 0, rem: 0 });

  const save = () => {
    if (!editing) return;
    if (!editing.title.trim()) return notify("عنوان بدهی را وارد کنید", "err");
    if (!editing.bankId) return notify("ابتدا یک بانک ثبت کنید", "err");
    upsertDebt(editing);
    notify("بدهی ذخیره و رمزنگاری شد", "ok");
    setEditing(null);
  };

  const quickPay = (d: DebtView) => {
    upsertDebt({
      ...d,
      paidCount: Math.min(d.count, d.paidCount + 1),
      status: d.paidCount + 1 >= d.count ? "done" : d.status,
    });
    notify(`یک قسط از «${d.title}» ثبت شد`, "ok");
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted">قسط ماهانه کل</p>
            <Amount value={sumActive.due} className="mt-1" />
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand">
            <Icon name="clock" size={19} />
          </span>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted">بدهی باقی‌مانده</p>
            <Amount value={sumActive.rem} className="mt-1" />
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-warn/15 text-warn">
            <Icon name="wallet" size={19} />
          </span>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted">موارد ثبت‌شده</p>
            <p className="num mt-1 text-base font-extrabold">
              {toFaDigits(String(views.length))} بدهی
            </p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ok/15 text-ok">
            <Icon name="receipt" size={19} />
          </span>
        </Card>
      </div>

      <Card>
        <SectionTitle
          icon="receipt"
          title="بدهی‌ها و اقساط"
          sub="وام، چک، اقساط کارت اعتباری و قرض‌های شخصی"
          action={
            <Button
              icon="plus"
              onClick={() =>
                setEditing(blankDebt(vault?.banks[0]?.id || ""))
              }
              disabled={!vault?.banks.length}
            >
              بدهی جدید
            </Button>
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "active", label: "فعال" },
              { value: "overdue", label: "معوق", icon: "alert" },
              { value: "done", label: "تسویه‌شده" },
              { value: "all", label: "همه" },
            ]}
          />
          <div className="relative min-w-0 flex-1">
            <Input
              className="py-2 pr-9 text-xs"
              placeholder="جستجو در بدهی‌ها…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Icon name="search" size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        </div>

        {!vault?.banks.length ? (
          <EmptyState icon="bank" title="ابتدا یک بانک اضافه کنید" desc="هر بدهی به یک بانک یا بستانکار متصل است." />
        ) : filtered.length === 0 ? (
          <EmptyState icon="receipt" title="بدهی‌ای یافت نشد" desc="با دکمه «بدهی جدید» اولین قسط یا وام خود را ثبت کنید." />
        ) : (
          <ul className="stagger space-y-3">
            {filtered.map((d) => (
              <li key={d.id} className="rounded-xl2 border border-line bg-surface2/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white"
                      style={{ background: d.bank?.color || "var(--c-brand)" }}
                    >
                      <Icon name={d.kind === "cheque" ? "file" : d.kind === "card" ? "card" : "receipt"} size={19} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-bold">{d.title}</p>
                        <Badge tone={d.effectiveStatus === "done" ? "ok" : d.overdue ? "bad" : "brand"}>
                          {DEBT_STATUS[d.effectiveStatus]}
                          {d.overdue ? " · معوق" : ""}
                        </Badge>
                        <Badge>{DEBT_KINDS[d.kind]}</Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted">
                        {d.bank?.name} · سررسید روز {toFaDigits(String(d.dueDay))} هر ماه
                        {d.effectiveStatus === "active" ? ` · نزدیک‌ترین: ${isoToJalaliText(d.nextDue)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {d.effectiveStatus === "active" && (
                      <>
                        <Button variant="soft" className="px-2.5 py-1.5 text-[11px]" icon="check" onClick={() => quickPay(d)}>
                          یک قسط پرداخت شد
                        </Button>
                        <Button className="px-2.5 py-1.5 text-[11px]" icon="card" onClick={() => setPayFor(d)}>
                          پرداخت کامل
                        </Button>
                      </>
                    )}
                    <IconButton icon="pencil" label="ویرایش" onClick={() => setEditing({ ...d })} />
                    <IconButton
                      icon="trash"
                      label="حذف"
                      onClick={() =>
                        ask(`حذف «${d.title}»؟`, "پرداخت‌های ثبت‌شده این بدهی هم حذف می‌شود.", () => {
                          removeDebt(d.id);
                          notify("بدهی حذف شد", "ok");
                        })
                      }
                    />
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-line bg-app/40 p-2.5">
                    <p className="text-[10px] text-muted">مبلغ هر قسط</p>
                    <Amount value={d.installment + (d.fee || 0)} className="mt-0.5 block text-sm" />
                    {!!d.fee && <p className="num text-[10px] text-muted">+ کارمزد {toFaDigits(String(d.fee))}</p>}
                  </div>
                  <div className="rounded-xl border border-line bg-app/40 p-2.5">
                    <p className="text-[10px] text-muted">اقساط پرداخت‌شده</p>
                    <p className="num mt-0.5 text-sm font-extrabold">
                      {toFaDigits(String(d.paidCount))} / {toFaDigits(String(d.count))}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-app/40 p-2.5">
                    <p className="text-[10px] text-muted">مانده کل</p>
                    <Amount value={d.remainingAmount} className="mt-0.5 block text-sm" />
                  </div>
                  <div className="rounded-xl border border-line bg-app/40 p-2.5">
                    <p className="text-[10px] text-muted">پرداخت ثبت‌شده</p>
                    <p className="num mt-0.5 text-sm font-extrabold">{humanMoney(d.paidAmount, vault?.settings.digits)}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
                    <span>پیشرفت تسویه</span>
                    <span className="num font-bold">{percent(d.paidCount, d.count, vault?.settings.digits)}</span>
                  </div>
                  <Progress
                    value={d.progress}
                    tone={
                      d.effectiveStatus === "done"
                        ? "linear-gradient(90deg,#10b981,#22d3ee)"
                        : d.overdue
                          ? "linear-gradient(90deg,#f43f5e,#f59e0b)"
                          : undefined
                    }
                  />
                  {d.note && <p className="mt-2 text-[11px] leading-5 text-muted">📝 {d.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------- مودال بدهی ---------- */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing && vault?.debts.some((x) => x.id === editing.id) ? "ویرایش بدهی" : "بدهی / قسط جدید"}
        icon="receipt"
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              انصراف
            </Button>
            <Button icon="check" onClick={save}>
              ذخیره
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="عنوان">
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="مثلاً وام مسکن سپه"
                />
              </Field>
              <Field label="بانک / بستانکار">
                <Select value={editing.bankId} onChange={(e) => setEditing({ ...editing, bankId: e.target.value })}>
                  {vault?.banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="نوع بدهی">
                <Select value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value as DebtKind })}>
                  {Object.entries(DEBT_KINDS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="وضعیت">
                <Select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as DebtStatus })}
                >
                  {Object.entries(DEBT_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="مبلغ هر قسط">
                <Input
                  className="num"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={editing.installment || ""}
                  onChange={(e) => setEditing({ ...editing, installment: +e.target.value })}
                />
              </Field>
              <Field label="کارمزد ماهانه (اختیاری)">
                <Input
                  className="num"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={editing.fee || ""}
                  onChange={(e) => setEditing({ ...editing, fee: +e.target.value })}
                />
              </Field>
              <Field label="مبلغ کل بدهی">
                <Input
                  className="num"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={editing.total || ""}
                  onChange={(e) => setEditing({ ...editing, total: +e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="تعداد کل اقساط">
                <Input
                  className="num"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={editing.count || ""}
                  onChange={(e) => setEditing({ ...editing, count: +e.target.value })}
                />
              </Field>
              <Field label="اقساط پرداخت‌شده">
                <Input
                  className="num"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={editing.paidCount || ""}
                  onChange={(e) => setEditing({ ...editing, paidCount: +e.target.value })}
                />
              </Field>
              <Field label="روز سررسید (شمسی)">
                <Input
                  className="num text-center"
                  type="number"
                  min={1}
                  max={31}
                  value={editing.dueDay || ""}
                  onChange={(e) => setEditing({ ...editing, dueDay: Math.min(31, Math.max(1, +e.target.value)) })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="تاریخ شروع (شمسی)" hint={isoToJalaliText(editing.startDate, true)}>
                <JalaliDateInput
                  value={editing.startDate}
                  onChange={(startDate) => setEditing({ ...editing, startDate })}
                />
              </Field>
              <Field label="یادداشت (اختیاری)">
                <Textarea value={editing.note || ""} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
              </Field>
            </div>

            <div className="rounded-xl border border-line bg-surface2/40 p-3 text-[11px] leading-6 text-muted">
              <p className="flex items-center gap-1.5 font-bold text-ink">
                <Icon name="info" size={14} className="text-brand" /> محاسبه خودکار
              </p>
              <p className="num mt-1">
                واریز ماهانه: {humanMoney((editing.installment || 0) + (editing.fee || 0), vault?.settings.digits)} ·
                مانده: {humanMoney(
                  Math.max(0, editing.count - editing.paidCount) * ((editing.installment || 0) + (editing.fee || 0)),
                  vault?.settings.digits
                )}
              </p>
              <p className="num">نزدیک‌ترین سررسید: {isoToJalaliText(nextDueIso(editing.dueDay))}</p>
            </div>
          </div>
        )}
      </Modal>

      <PaymentModal open={!!payFor} onClose={() => setPayFor(null)} preset={payFor ? { debt: payFor } : null} />
      {node}
    </div>
  );
}


