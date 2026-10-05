import { useMemo, useState } from "react";
import { useApp } from "../store";
import { Amount, Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, Reveal, SectionTitle, Select, Textarea, useConfirm } from "../components/ui";
import { Icon } from "../components/Icons";
import { BANK_COLORS, BANK_KINDS, type Bank, type BankKind } from "../types";
import { bankViews, debtViews } from "../lib/stats";
import { groupCard, maskValue, toFaDigits, uid } from "../lib/format";
import { isoToJalaliText } from "../lib/jalali";
import { PaymentModal } from "../components/PaymentModal";

function blankBank(): Bank {
  return {
    id: uid("bank"),
    name: "",
    kind: "bank",
    branch: "",
    accountNo: "",
    cardNo: "",
    sheba: "",
    phone: "",
    color: BANK_COLORS[Math.floor(Math.random() * BANK_COLORS.length)],
    note: "",
    createdAt: Date.now(),
  };
}

export default function Banks() {
  const { vault, upsertBank, removeBank, notify } = useApp();
  const { ask, node } = useConfirm();
  const [editing, setEditing] = useState<Bank | null>(null);
  const [q, setQ] = useState("");
  const [payBank, setPayBank] = useState<string | null>(null);

  const views = useMemo(() => debtViews(vault!), [vault]);
  const list = useMemo(() => bankViews(vault!, views, true), [vault, views]);
  const filtered = list.filter((b) => (b.bank.name + (b.bank.branch || "")).includes(q.trim()));

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) return notify("نام بانک را وارد کنید", "err");
    upsertBank(editing);
    notify("اطلاعات بانک ذخیره و رمزنگاری شد", "ok");
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          icon="bank"
          title="حساب‌ها و بانک‌ها"
          sub={`${toFaDigits(String(list.length))} مورد ثبت شده · شماره کارت‌ها رمزنگاری و به‌صورت ماسک نمایش داده می‌شوند`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Input
                  className="w-44 py-2 pr-9 text-xs"
                  placeholder="جستجو…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Icon name="search" size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              </div>
              <Button icon="plus" onClick={() => setEditing(blankBank())}>
                بانک جدید
              </Button>
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon="bank"
            title="هیچ بانکی ثبت نشده"
            desc="بانک‌ها، صندوق‌ها یا افراد بستانکری که با آن‌ها کار می‌کنید را اضافه کنید."
            action={
              <Button icon="plus" onClick={() => setEditing(blankBank())}>
                افزودن اولین بانک
              </Button>
            }
          />
        ) : (
          <ul className="stagger grid gap-3 md:grid-cols-2">
            {filtered.map((b) => (
              <li key={b.bank.id} className="overflow-hidden rounded-xl2 border border-line bg-surface2/40">
                <div
                  className="h-1.5 w-full"
                  style={{ background: `linear-gradient(90deg,${b.bank.color},transparent)` }}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white"
                        style={{ background: b.bank.color }}
                      >
                        <Icon name={b.bank.kind === "person" ? "file" : b.bank.kind === "fund" ? "shield" : "bank"} size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold">{b.bank.name}</p>
                        <p className="text-[11px] text-muted">
                          {BANK_KINDS[b.bank.kind]}
                          {b.bank.branch ? ` · شعبه ${b.bank.branch}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <IconButton icon="pencil" label="ویرایش" onClick={() => setEditing({ ...b.bank })} />
                      <IconButton
                        icon="trash"
                        label="حذف"
                        onClick={() =>
                          ask(
                            `حذف «${b.bank.name}»؟`,
                            "همه بدهی‌ها و پرداخت‌های مرتبط با این بانک نیز حذف می‌شوند. این عمل بازگشت‌پذیر نیست (مگر با بازیابی پشتیبان).",
                            () => {
                              removeBank(b.bank.id);
                              notify("بانک حذف شد", "ok");
                            }
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3.5 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-line bg-app/40 p-2.5">
                      <p className="text-[10px] text-muted">واریز لازم این ماه</p>
                      <Amount value={b.monthlyDue} className="mt-0.5 block text-sm" />
                    </div>
                    <div className="rounded-xl border border-line bg-app/40 p-2.5">
                      <p className="text-[10px] text-muted">بدهی باقی‌مانده</p>
                      <Amount value={b.remaining} className="mt-0.5 block text-sm" />
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-[11px] text-muted">
                    {b.bank.cardNo && (
                      <p className="flex items-center gap-1.5">
                        <Icon name="card" size={13} />
                        <Reveal text={groupCard(b.bank.cardNo)} className="font-bold text-ink" />
                      </p>
                    )}
                    {b.bank.accountNo && (
                      <p className="num flex items-center gap-1.5">
                        <Icon name="file" size={13} />
                        حساب: {maskValue(b.bank.accountNo, 5)}
                      </p>
                    )}
                    {b.bank.sheba && (
                      <p className="num flex items-center gap-1.5">
                        <Icon name="wallet" size={13} />
                        شبا: {toFaDigits(b.bank.sheba)}
                      </p>
                    )}
                    {b.bank.phone && (
                      <p className="num flex items-center gap-1.5">
                        <Icon name="phone" size={13} />
                        {toFaDigits(b.bank.phone)}
                      </p>
                    )}
                    {b.nextDueDate && (
                      <p className="flex items-center gap-1.5">
                        <Icon name="calendar" size={13} />
                        نزدیک‌ترین سررسید: {isoToJalaliText(b.nextDueDate)}
                      </p>
                    )}
                    {b.bank.note && <p className="pt-1 leading-5">📝 {b.bank.note}</p>}
                  </div>

                  <div className="mt-3.5 flex items-center gap-2">
                    <Button variant="soft" className="flex-1 py-2 text-xs" icon="card" onClick={() => setPayBank(b.bank.id)}>
                      ثبت واریز
                    </Button>
                    <Badge tone={b.activeDebts ? "brand" : "ok"}>
                      {b.activeDebts ? `${toFaDigits(String(b.activeDebts))} بدهی فعال` : "تسویه‌شده"}
                    </Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------- مودال ویرایش بانک ---------- */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing && vault!.banks.some((b) => b.id === editing.id) ? "ویرایش بانک" : "بانک جدید"}
        icon="bank"
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
              <Field label="نام بانک / بستانکار">
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="مثلاً بانک سپه"
                />
              </Field>
              <Field label="نوع">
                <Select
                  value={editing.kind}
                  onChange={(e) => setEditing({ ...editing, kind: e.target.value as BankKind })}
                >
                  {Object.entries(BANK_KINDS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="شعبه (اختیاری)">
                <Input value={editing.branch || ""} onChange={(e) => setEditing({ ...editing, branch: e.target.value })} />
              </Field>
              <Field label="شماره کارت (اختیاری)">
                <Input
                  className="num"
                  inputMode="numeric"
                  value={editing.cardNo || ""}
                  onChange={(e) => setEditing({ ...editing, cardNo: e.target.value.replace(/[^\d ]/g, "") })}
                  placeholder="6037 9911 ..."
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="شماره حساب (اختیاری)">
                <Input
                  className="num"
                  value={editing.accountNo || ""}
                  onChange={(e) => setEditing({ ...editing, accountNo: e.target.value })}
                />
              </Field>
              <Field label="شماره شبا (اختیاری)">
                <Input
                  className="num"
                  value={editing.sheba || ""}
                  onChange={(e) => setEditing({ ...editing, sheba: e.target.value })}
                  placeholder="IR..."
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="تلفن شعبه / بستانکار (اختیاری)">
                <Input
                  className="num"
                  value={editing.phone || ""}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </Field>
              <Field label="رنگ شناسه">
                <div className="flex flex-wrap gap-2 pt-1">
                  {BANK_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditing({ ...editing, color: c })}
                      className="h-8 w-8 rounded-xl transition"
                      style={{
                        background: c,
                        outline: editing.color === c ? "2px solid var(--c-ink)" : "none",
                        outlineOffset: 2,
                      }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </Field>
            </div>

            <Field label="یادداشت (اختیاری)">
              <Textarea value={editing.note || ""} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
            </Field>

            <p className="flex items-start gap-2 rounded-xl border border-line bg-surface2/40 p-3 text-[11px] leading-6 text-muted">
              <Icon name="shieldcheck" size={15} className="mt-0.5 shrink-0 text-ok" />
              این اطلاعات در گاوصندوق رمزنگاری‌شده (AES-GCM-256) ذخیره می‌شود و تنها پس از ورود با رمز عبور
              قابل مشاهده است.
            </p>
          </div>
        )}
      </Modal>

      <PaymentModal open={!!payBank} onClose={() => setPayBank(null)} preset={payBank ? { bankId: payBank } : null} />
      {node}
    </div>
  );
}
