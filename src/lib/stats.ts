import type { Bank, Debt, Payment, Vault } from "../types";
import {
  currentJalaliMonthKey,
  daysUntil,
  isoJalaliMonthKey,
  jalaliMonthKeyOffset,
  monthKeyLabel,
  nextDueIso,
} from "./jalali";

export interface DebtView extends Debt {
  bank: Bank | undefined;
  remainingCount: number;
  monthlyDue: number;
  remainingAmount: number;
  paidAmount: number;
  nextDue: string;
  nextDueDays: number;
  progress: number;
  overdue: boolean;
  effectiveStatus: Debt["status"];
}

export function debtViews(vault: Vault): DebtView[] {
  const bankById = new Map(vault.banks.map((b) => [b.id, b]));
  return vault.debts
    .map((d) => {
      const bank = bankById.get(d.bankId);
      const remainingCount = Math.max(0, (d.count || 0) - (d.paidCount || 0));
      const finished = remainingCount === 0;
      const effectiveStatus: Debt["status"] = finished ? "done" : d.status;
      const per = (d.installment || 0) + (d.fee || 0);
      const monthlyDue = effectiveStatus === "active" ? per : 0;
      const remainingAmount = effectiveStatus === "active" ? per * remainingCount : 0;
      const nextDue = effectiveStatus === "active" ? nextDueIso(d.dueDay || 1) : "";
      const nextDueDays = nextDue ? daysUntil(nextDue) : 999;
      const paidAmount = vault.payments
        .filter((p) => p.debtId === d.id)
        .reduce((s, p) => s + (p.amount || 0), 0);
      return {
        ...d,
        bank,
        remainingCount,
        monthlyDue,
        remainingAmount,
        paidAmount,
        nextDue,
        nextDueDays,
        progress: d.count ? Math.min(100, ((d.count - remainingCount) / d.count) * 100) : 0,
        overdue: effectiveStatus === "active" && nextDueDays < 0,
        effectiveStatus,
      };
    })
    .sort((a, b) => a.nextDueDays - b.nextDueDays || b.monthlyDue - a.monthlyDue);
}

export interface BankView {
  bank: Bank;
  monthlyDue: number;
  remaining: number;
  activeDebts: number;
  totalDebts: number;
  nextDueDate: string;
  nextDueDays: number;
  paidThisMonth: number;
  share: number;
}

export function bankViews(vault: Vault, views: DebtView[], includeEmpty = false): BankView[] {
  const list = vault.banks
    .filter((b) => !b.archived)
    .map((bank) => {
      const mine = views.filter((d) => d.bankId === bank.id);
      const active = mine.filter((d) => d.effectiveStatus === "active");
      const next =
        active.length > 0
          ? active.reduce(
              (acc, d) => (d.nextDueDays < acc.nextDueDays ? d : acc),
              active[0]
            )
          : undefined;
      const mk = currentJalaliMonthKey();
      const paidThisMonth = vault.payments
        .filter((p) => p.bankId === bank.id && isoJalaliMonthKey(p.date) === mk)
        .reduce((s, p) => s + (p.amount || 0), 0);
      return {
        bank,
        monthlyDue: active.reduce((s, d) => s + d.monthlyDue, 0),
        remaining: active.reduce((s, d) => s + d.remainingAmount, 0),
        activeDebts: active.length,
        totalDebts: mine.length,
        nextDueDate: next?.nextDue || "",
        nextDueDays: next?.nextDueDays ?? 999,
        paidThisMonth,
        share: 0,
      };
    })
    .filter((b) => includeEmpty || b.totalDebts > 0 || b.monthlyDue > 0 || b.paidThisMonth > 0)
    .sort((a, b) => b.monthlyDue - a.monthlyDue || a.nextDueDays - b.nextDueDays);

  const totalMonthly = list.reduce((s, b) => s + b.monthlyDue, 0) || 1;
  for (const b of list) b.share = (b.monthlyDue / totalMonthly) * 100;
  return list;
}

export function totals(vault: Vault, views: DebtView[]) {
  const active = views.filter((d) => d.effectiveStatus === "active");
  const mk = currentJalaliMonthKey();
  const paidThisMonth = vault.payments
    .filter((p) => isoJalaliMonthKey(p.date) === mk)
    .reduce((s, p) => s + (p.amount || 0), 0);
  const paidTotal = vault.payments.reduce((s, p) => s + (p.amount || 0), 0);
  const monthlyDue = active.reduce((s, d) => s + d.monthlyDue, 0);
  const remaining = active.reduce((s, d) => s + d.remainingAmount, 0);
  const overdue = active.filter((d) => d.overdue);
  const soon = active.filter((d) => !d.overdue && d.nextDueDays <= (vault.settings.warnDays ?? 5));
  const plannedTotal = active.reduce((s, d) => s + (d.installment + d.fee) * (d.count - d.paidCount > 0 ? d.count - d.paidCount : 0), 0);
  const progressAll = plannedTotal ? ((plannedTotal - remaining) / plannedTotal) * 100 : 0;
  return {
    monthlyDue,
    remaining,
    paidThisMonth,
    paidTotal,
    plannedTotal,
    progressAll: Math.min(100, Math.max(0, progressAll)),
    activeCount: active.length,
    doneCount: views.length - active.length,
    bankCount: vault.banks.filter((b) => !b.archived).length,
    overdue,
    soon,
    nextUp: [...active].sort((a, b) => a.nextDueDays - b.nextDueDays).slice(0, 5),
  };
}

export function monthlySeries(vault: Vault, months = 6) {
  const out: { key: string; label: string; paid: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = jalaliMonthKeyOffset(i);
    const paid = vault.payments
      .filter((p) => isoJalaliMonthKey(p.date) === key)
      .reduce((s, p) => s + (p.amount || 0), 0);
    out.push({ key, label: monthKeyLabel(key).split(" ")[0], paid });
  }
  return out;
}

export function kindBreakdown(views: DebtView[]) {
  const map = new Map<string, { label: string; value: number; color: string }>();
  const palette = ["#6d5efc", "#22d3ee", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];
  let i = 0;
  for (const d of views) {
    if (d.effectiveStatus !== "active") continue;
    const key = d.kind;
    const prev = map.get(key);
    const value = (prev?.value || 0) + d.remainingAmount;
    map.set(key, { label: d.kind, value, color: palette[i % palette.length] });
    if (!prev) i++;
  }
  return [...map.values()];
}

export function suggestPayment(debt: DebtView): { amount: number; kind: Payment["kind"] } {
  return {
    amount: debt.monthlyDue || debt.installment,
    kind: debt.kind === "cheque" ? "extra" : "installment",
  };
}
