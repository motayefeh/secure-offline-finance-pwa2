export type ID = string;

export type BankKind = "bank" | "fund" | "person" | "other";
export type DebtKind = "installment" | "loan" | "cheque" | "card" | "personal" | "other";
export type DebtStatus = "active" | "paused" | "done";
export type PaymentKind = "installment" | "extra" | "penalty" | "deposit";
export type PayMethod = "transfer" | "cash" | "cheque" | "auto" | "other";

export interface Bank {
  id: ID;
  name: string;
  kind: BankKind;
  branch?: string;
  accountNo?: string;
  cardNo?: string;
  sheba?: string;
  phone?: string;
  color: string;
  note?: string;
  archived?: boolean;
  createdAt: number;
}

export interface Debt {
  id: ID;
  bankId: ID;
  title: string;
  kind: DebtKind;
  status: DebtStatus;
  total: number;
  installment: number;
  count: number;
  paidCount: number;
  fee: number;
  dueDay: number;
  startDate: string;
  note?: string;
  createdAt: number;
}

export interface Payment {
  id: ID;
  debtId?: ID;
  bankId: ID;
  amount: number;
  date: string;
  kind: PaymentKind;
  method: PayMethod;
  ref?: string;
  note?: string;
  createdAt: number;
}

export interface Settings {
  ownerName: string;
  theme: "dark" | "light";
  accent: string;
  autoLockMin: number;
  lockOnHide: boolean;
  hideAmounts: boolean;
  digits: "fa" | "en";
  currency: string;
  warnDays: number;
}

export interface LogEvent {
  id: ID;
  ts: number;
  type: "auth" | "edit" | "delete" | "pay" | "backup" | "restore" | "security" | "system";
  msg: string;
}

export interface Vault {
  v: 1;
  createdAt: number;
  updatedAt: number;
  settings: Settings;
  banks: Bank[];
  debts: Debt[];
  payments: Payment[];
  events: LogEvent[];
}

export interface VaultMeta {
  v: 1;
  salt: string;
  iterations: number;
  createdAt: number;
  updatedAt: number;
  hint: string;
  failed: number;
  lockUntil: number;
  algo: string;
}

export const DEFAULT_SETTINGS: Settings = {
  ownerName: "",
  theme: "dark",
  accent: "#6d5efc",
  autoLockMin: 5,
  lockOnHide: true,
  hideAmounts: false,
  digits: "fa",
  currency: "تومان",
  warnDays: 5,
};

export const BANK_KINDS: Record<BankKind, string> = {
  bank: "بانک",
  fund: "صندوق / تعاونی",
  person: "شخص حقیقی",
  other: "سایر",
};

export const DEBT_KINDS: Record<DebtKind, string> = {
  installment: "قسطی",
  loan: "وام",
  cheque: "چک",
  card: "اقساط کارت اعتباری",
  personal: "قرض شخصی",
  other: "سایر",
};

export const DEBT_STATUS: Record<DebtStatus, string> = {
  active: "فعال",
  paused: "موقتاً متوقف",
  done: "تسویه‌شده",
};

export const PAYMENT_KINDS: Record<PaymentKind, string> = {
  installment: "قسط ماهانه",
  extra: "پرداخت اضافه / تسویه",
  penalty: "جریمه و کارمزد",
  deposit: "واریز به حساب",
};

export const PAY_METHODS: Record<PayMethod, string> = {
  transfer: "انتقال / ساتنا",
  cash: "نقدی",
  cheque: "چک",
  auto: "کسر خودکار",
  other: "سایر",
};

export const BANK_COLORS = [
  "#6d5efc",
  "#22d3ee",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#0ea5e9",
  "#ec4899",
  "#84cc16",
  "#f97316",
];
