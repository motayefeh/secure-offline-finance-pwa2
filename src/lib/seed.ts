import type { Bank, Debt, Payment, Vault } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import { uid } from "./format";
import { jalaaliToIso, todayJalaali, todayIso } from "./jalali";

export function demoVault(): Partial<Vault> {
  const t = todayJalaali();
  const iso = (jy: number, jm: number, jd: number) => jalaaliToIso(jy, jm, jd);
  const cur = `${t.jy}`;

  const banks: Bank[] = [
    {
      id: "b_sepeh",
      name: "بانک سپه",
      kind: "bank",
      branch: "شهرک غرب",
      accountNo: "0345123456789",
      cardNo: "6037-6912-3456-7890",
      color: "#6d5efc",
      note: "وام مسکن",
      createdAt: Date.now(),
    },
    {
      id: "b_mehr",
      name: "بانک مهر ایران",
      kind: "bank",
      branch: "واحد مرکزی",
      accountNo: "1188997766",
      cardNo: "6034-2211-8899-0011",
      color: "#22d3ee",
      note: "قرض‌الحسنه",
      createdAt: Date.now(),
    },
    {
      id: "b_mellat",
      name: "بانک ملت",
      kind: "bank",
      branch: "خیابان ولیعصر",
      accountNo: "9988776655",
      cardNo: "6104-3377-2211-4455",
      color: "#f43f5e",
      note: "کارت اعتباری",
      createdAt: Date.now(),
    },
    {
      id: "b_family",
      name: "صندوق خانواده",
      kind: "fund",
      color: "#10b981",
      note: "قرض شخصی خانوادگی",
      createdAt: Date.now(),
    },
  ];

  const debts: Debt[] = [
    {
      id: "d_1",
      bankId: "b_sepeh",
      title: "وام مسکن سپه",
      kind: "loan",
      status: "active",
      total: 480_000_000,
      installment: 9_850_000,
      count: 60,
      paidCount: 22,
      fee: 120_000,
      dueDay: 5,
      startDate: iso(t.jy - 2, 2, 15),
      createdAt: Date.now(),
    },
    {
      id: "d_2",
      bankId: "b_mehr",
      title: "وام قرض‌الحسنه مهر ایران",
      kind: "installment",
      status: "active",
      total: 120_000_000,
      installment: 2_750_000,
      count: 48,
      paidCount: 30,
      fee: 0,
      dueDay: 10,
      startDate: iso(t.jy - 1, 6, 1),
      createdAt: Date.now(),
    },
    {
      id: "d_3",
      bankId: "b_mellat",
      title: "اقساط کارت اعتباری ملت",
      kind: "card",
      status: "active",
      total: 36_000_000,
      installment: 3_000_000,
      count: 12,
      paidCount: 4,
      fee: 250_000,
      dueDay: 20,
      startDate: iso(Number(cur) - 1, 9, 20),
      createdAt: Date.now(),
    },
    {
      id: "d_4",
      bankId: "b_family",
      title: "قرض خانوادگی",
      kind: "personal",
      status: "active",
      total: 90_000_000,
      installment: 5_000_000,
      count: 18,
      paidCount: 6,
      fee: 0,
      dueDay: 15,
      startDate: iso(t.jy - 1, 1, 10),
      note: "بدون سود، ماهانه",
      createdAt: Date.now(),
    },
    {
      id: "d_5",
      bankId: "b_sepeh",
      title: "چک صادره اجاره",
      kind: "cheque",
      status: "active",
      total: 24_000_000,
      installment: 12_000_000,
      count: 2,
      paidCount: 1,
      fee: 0,
      dueDay: 28,
      startDate: iso(t.jy, 1, 28),
      createdAt: Date.now(),
    },
  ];

  const payments: Payment[] = [];
  const now = new Date();
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 6);
    const p = (x: number) => String(x).padStart(2, "0");
    const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    payments.push({
      id: uid("pay"),
      debtId: "d_1",
      bankId: "b_sepeh",
      amount: 9_970_000,
      date,
      kind: "installment",
      method: "transfer",
      note: "پرداخت خودکار قسط",
      createdAt: Date.now(),
    });
    if (m <= 4)
      payments.push({
        id: uid("pay"),
        debtId: "d_2",
        bankId: "b_mehr",
        amount: 2_750_000,
        date,
        kind: "installment",
        method: "cash",
        createdAt: Date.now(),
      });
  }
  payments.push({
    id: uid("pay"),
    debtId: "d_3",
    bankId: "b_mellat",
    amount: 3_250_000,
    date: todayIso(),
    kind: "installment",
    method: "transfer",
    createdAt: Date.now(),
  });

  return {
    settings: { ...DEFAULT_SETTINGS, ownerName: "کاربر" },
    banks,
    debts,
    payments,
    events: [
      {
        id: uid("ev"),
        ts: Date.now(),
        type: "system",
        msg: "داده نمونه بارگذاری شد",
      },
    ],
  };
}
