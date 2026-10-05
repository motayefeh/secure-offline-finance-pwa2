import { useEffect, useState } from "react";
import { useApp } from "../store";
import type { DebtView } from "../lib/stats";
import type { Payment, PayMethod, PaymentKind } from "../types";
import { PAY_METHODS, PAYMENT_KINDS } from "../types";
import { Button, Field, Input, Modal, Select, Textarea } from "./ui";
import { JalaliDateInput } from "./JalaliDateInput";
import { todayIso, isoToJalaliText } from "../lib/jalali";
import { uid } from "../lib/format";
import { cn } from "../utils/cn";

export function PaymentModal({
  open,
  onClose,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  preset?: {
    debt?: DebtView;
    bankId?: string;
    amount?: number;
    kind?: PaymentKind;
    payment?: Payment;
  } | null;
}) {
  const { vault, upsertPayment, notify } = useApp();
  const [form, setForm] = useState<Payment>(() => blank(""));
  const [bump, setBump] = useState(true);

  useEffect(() => {
    if (!open) return;
    const banks = vault?.banks || [];
    const firstDebt = preset?.debt;
    if (preset?.payment) {
      setForm({ ...preset.payment });
      setBump(false);
      return;
    }
    const bankId = firstDebt?.bankId || preset?.bankId || banks[0]?.id || "";
    setForm({
      ...blank(bankId),
      debtId: firstDebt?.id,
      amount: preset?.amount ?? firstDebt?.monthlyDue ?? 0,
      kind: preset?.kind ?? "installment",
    });
    setBump(!!firstDebt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset?.debt?.id, preset?.bankId, preset?.payment?.id]);

  const debts = vault?.debts || [];
  const linkedDebt = debts.find((d) => d.id === form.debtId);

  const submit = () => {
    if (!form.bankId) return notify("ابتدا یک بانک ثبت کنید", "err");
    if (!form.amount || form.amount <= 0) return notify("مبلغ را وارد کنید", "err");
    upsertPayment({ ...form, createdAt: form.createdAt || Date.now() }, { bumpInstallment: bump });
    notify("پرداخت با موفقیت ثبت و رمزنگاری شد", "ok");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ثبت پرداخت جدید"
      icon="card"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button icon="check" onClick={submit}>
            ذخیره پرداخت
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="بانک / حساب">
            <Select value={form.bankId} onChange={(e) => setForm({ ...form, bankId: e.target.value })}>
              {(vault?.banks || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              {!(vault?.banks || []).length && <option value="">بانکی ثبت نشده</option>}
            </Select>
          </Field>
          <Field label="مرتبط با بدهی (اختیاری)">
            <Select
              value={form.debtId || ""}
              onChange={(e) => {
                const id = e.target.value;
                const d = debts.find((x) => x.id === id);
                setForm({
                  ...form,
                  debtId: id || undefined,
                  bankId: d?.bankId || form.bankId,
                  amount: d ? (d.installment || 0) + (d.fee || 0) : form.amount,
                  kind: d ? "installment" : form.kind,
                });
                if (d) setBump(true);
              }}
            >
              <option value="">— بدون اتصال —</option>
              {debts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="مبلغ (تومان)">
            <Input
              className="num"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: +e.target.value })}
            />
          </Field>
          <Field label="نوع پرداخت">
            <Select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as PaymentKind })}
            >
              {Object.entries(PAYMENT_KINDS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="تاریخ پرداخت (شمسی)" hint={isoToJalaliText(form.date, true)}>
          <JalaliDateInput value={form.date} onChange={(date) => setForm({ ...form, date })} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="روش پرداخت">
            <Select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value as PayMethod })}
            >
              {Object.entries(PAY_METHODS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="شماره پیگیری / رسید (اختیاری)">
            <Input
              className="num"
              value={form.ref || ""}
              onChange={(e) => setForm({ ...form, ref: e.target.value })}
              placeholder="مثلاً ۹۹۸۸۷۷"
            />
          </Field>
        </div>

        {linkedDebt && form.kind === "installment" && (
          <button
            type="button"
            onClick={() => setBump((b) => !b)}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-right text-xs font-bold transition",
              bump ? "border-ok/35 bg-ok/10 text-ok" : "border-line bg-surface2/50 text-muted"
            )}
          >
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-md border",
                bump ? "border-ok bg-ok/25" : "border-line"
              )}
            >
              {bump && <span className="text-[10px]">✓</span>}
            </span>
            یک قسط از «{linkedDebt.title}» پرداخت‌شده محاسبه شود
          </button>
        )}

        <Field label="یادداشت (اختیاری)">
          <Textarea
            value={form.note || ""}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="توضیحات…"
          />
        </Field>
      </div>
    </Modal>
  );
}

export function blank(bankId: string): Payment {
  return {
    id: uid("pay"),
    bankId,
    amount: 0,
    date: todayIso(),
    kind: "installment",
    method: "transfer",
    ref: "",
    note: "",
    createdAt: Date.now(),
  };
}
