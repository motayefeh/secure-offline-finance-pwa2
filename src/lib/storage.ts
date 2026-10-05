import type { Cipher } from "./crypto";
import type { Vault, VaultMeta } from "../types";
import { DEFAULT_SETTINGS } from "../types";

const K = {
  meta: "pf.meta.v1",
  vault: "pf.vault.v1",
  ui: "pf.ui.v1",
};

export const ALGO = "PBKDF2-SHA256 / AES-GCM-256";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const storage = {
  get meta(): VaultMeta | null {
    return safeParse<VaultMeta>(localStorage.getItem(K.meta));
  },
  set meta(m: VaultMeta | null) {
    if (m) localStorage.setItem(K.meta, JSON.stringify(m));
    else localStorage.removeItem(K.meta);
  },
  get cipher(): Cipher | null {
    return safeParse<Cipher>(localStorage.getItem(K.vault));
  },
  set cipher(c: Cipher | null) {
    if (c) localStorage.setItem(K.vault, JSON.stringify(c));
    else localStorage.removeItem(K.vault);
  },
  get ui(): Record<string, unknown> {
    return safeParse<Record<string, unknown>>(localStorage.getItem(K.ui)) || {};
  },
  set ui(obj: Record<string, unknown>) {
    localStorage.setItem(K.ui, JSON.stringify(obj));
  },
  wipe() {
    localStorage.removeItem(K.meta);
    localStorage.removeItem(K.vault);
    localStorage.removeItem(K.ui);
  },
  usage() {
    let bytes = 0;
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("pf.")) bytes += (localStorage.getItem(k) || "").length * 2;
    }
    return bytes;
  },
};

export function emptyVault(): Vault {
  const now = Date.now();
  return {
    v: 1,
    createdAt: now,
    updatedAt: now,
    settings: { ...DEFAULT_SETTINGS },
    banks: [],
    debts: [],
    payments: [],
    events: [],
  };
}

/** پاکسازی رویدادهای قدیمی برای سبز نگه‌داشتن حجم ذخیره‌سازی */
export function trimEvents(events: Vault["events"], max = 400): Vault["events"] {
  if (events.length <= max) return events;
  return events.slice(0, max);
}

export function downloadFile(name: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface BackupFile {
  app: string;
  v: 1;
  createdAt: number;
  algo: string;
  iterations: number;
  salt: string;
  cipher: Cipher;
  counts?: { banks: number; debts: number; payments: number };
}

export function makeBackupName(tag: string) {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `pf-backup-${tag}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours()
  )}${p(d.getMinutes())}.json`;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("خواندن فایل ناموفق بود"));
    r.readAsText(file, "utf-8");
  });
}
