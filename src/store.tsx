import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Bank, Debt, LogEvent, Payment, Settings, Vault, VaultMeta } from "./types";
import { decryptJson, deriveKey, encryptJson, fromB64, newSalt, DEFAULT_ITERATIONS } from "./lib/crypto";
import {
  ALGO,
  emptyVault,
  makeBackupName,
  storage,
  trimEvents,
  downloadFile,
  type BackupFile,
} from "./lib/storage";
import { uid } from "./lib/format";
import { demoVault } from "./lib/seed";

export type Status = "loading" | "setup" | "locked" | "unlocked";
export type ToastKind = "ok" | "err" | "info";
export interface Toast {
  id: string;
  kind: ToastKind;
  msg: string;
}

interface EvSpec {
  type: LogEvent["type"];
  msg: string;
}

interface Ctx {
  status: Status;
  meta: VaultMeta | null;
  vault: Vault | null;
  settings: Settings | null;
  busy: string | null;
  saving: "idle" | "saving" | "saved";
  toasts: Toast[];
  notify: (msg: string, kind?: ToastKind) => void;
  dismiss: (id: string) => void;
  createVault: (password: string, opts: { hint: string; ownerName: string; demo: boolean }) => Promise<void>;
  unlock: (password: string) => Promise<{ ok: boolean; waitSec?: number }>;
  lock: (reason?: string) => void;
  mutate: (fn: (v: Vault) => void, ev?: EvSpec) => void;
  updateSettings: (patch: Partial<Settings>, ev?: EvSpec) => void;
  upsertBank: (b: Bank) => void;
  removeBank: (id: string) => void;
  upsertDebt: (d: Debt) => void;
  removeDebt: (id: string) => void;
  upsertPayment: (p: Payment, opts?: { bumpInstallment?: boolean; prevDebtId?: string }) => void;
  removePayment: (id: string) => void;
  changePassword: (current: string, next: string, hint: string) => Promise<boolean>;
  exportEncrypted: (password: string) => Promise<void>;
  restoreEncrypted: (file: File, password: string) => Promise<{ ok: boolean; msg: string }>;
  exportPlain: () => void;
  restorePlain: (file: File) => Promise<{ ok: boolean; msg: string }>;
  loadDemo: () => void;
  wipeAll: () => void;
  lockInSec: number;
  sessionMinutes: number;
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

const MAX_EVENTS = 400;

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [meta, setMeta] = useState<VaultMeta | null>(null);
  const [vault, setVault] = useState<Vault | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lockInSec, setLockInSec] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState(0);

  const keyRef = useRef<CryptoKey | null>(null);
  const lastActivity = useRef<number>(Date.now());
  const sessionStart = useRef<number>(Date.now());
  const saveTimer = useRef<number | null>(null);
  const pendingVault = useRef<Vault | null>(null);

  /* ---------- boot ---------- */
  useEffect(() => {
    const m = storage.meta;
    setMeta(m);
    setStatus(m ? "locked" : "setup");
  }, []);

  const notify = useCallback((msg: string, kind: ToastKind = "info") => {
    const id = uid("t");
    setToasts((t) => [...t.slice(-3), { id, kind, msg }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const dismiss = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  /* ---------- persist ---------- */
  const persist = useCallback((next: Vault) => {
    pendingVault.current = next;
    setSaving("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const key = keyRef.current;
      const data = pendingVault.current;
      if (!key || !data) return;
      try {
        const cipher = await encryptJson(key, data);
        storage.cipher = cipher;
        const m = storage.meta;
        if (m) {
          const updated = { ...m, updatedAt: Date.now() };
          storage.meta = updated;
          setMeta(updated);
        }
        setSaving("saved");
        window.setTimeout(() => setSaving("idle"), 1400);
      } catch {
        setSaving("idle");
        notify("ذخیره‌سازی ناموفق بود (حافظه پر یا دسترسی محدود)", "err");
      }
    }, 220);
  }, [notify]);

  const mutate = useCallback(
    (fn: (v: Vault) => void, ev?: EvSpec) => {
      setVault((prev) => {
        if (!prev) return prev;
        const next: Vault = {
          ...prev,
          settings: { ...prev.settings },
          banks: prev.banks.map((x) => ({ ...x })),
          debts: prev.debts.map((x) => ({ ...x })),
          payments: prev.payments.map((x) => ({ ...x })),
          events: [...prev.events],
        };
        fn(next);
        next.updatedAt = Date.now();
        if (ev) {
          next.events = trimEvents(
            [{ id: uid("ev"), ts: Date.now(), type: ev.type, msg: ev.msg }, ...next.events],
            MAX_EVENTS
          );
        }
        persist(next);
        return next;
      });
    },
    [persist]
  );



  /* ---------- theme ---------- */
  useEffect(() => {
    if (!vault) return;
    const s = vault.settings;
    const root = document.documentElement;
    root.classList.toggle("dark", s.theme === "dark");
    root.classList.toggle("light", s.theme === "light");
    root.style.setProperty("--c-brand", s.accent);
  }, [vault?.settings.theme, vault?.settings.accent, vault]);

  /* ---------- activity / auto lock ---------- */
  useEffect(() => {
    if (status !== "unlocked") return;
    const bump = () => (lastActivity.current = Date.now());
    const events = ["pointerdown", "keydown", "wheel", "touchstart", "mousemove"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));

    const tick = window.setInterval(() => {
      const mins = vault?.settings.autoLockMin ?? 5;
      const elapsedIdle = (Date.now() - lastActivity.current) / 1000;
      const limit = Math.max(15, mins * 60);
      setLockInSec(Math.max(0, Math.ceil(limit - elapsedIdle)));
      setSessionMinutes(Math.round((Date.now() - sessionStart.current) / 60000));
      if (elapsedIdle >= limit) doLock("قفل خودکار به دلیل عدم فعالیت");
    }, 1000);

    let hideAt = 0;
    const onVis = () => {
      if (document.hidden) {
        hideAt = Date.now();
      } else if (hideAt && Date.now() - hideAt < 1000 * 60 * 60) {
        lastActivity.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, vault?.settings.autoLockMin]);

  /* ---------- lock on hide ---------- */
  useEffect(() => {
    if (status !== "unlocked") return;
    if (!vault?.settings.lockOnHide) return;
    let timer = 0;
    const onVis = () => {
      if (document.hidden) {
        timer = window.setTimeout(() => doLock("قفل خودکار هنگام ترک برنامه"), 45_000);
      } else if (timer) {
        window.clearTimeout(timer);
        timer = 0;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, vault?.settings.lockOnHide]);

  const doLock = useCallback(
    (reason?: string) => {
      keyRef.current = null;
      pendingVault.current = null;
      setVault(null);
      setMeta(storage.meta);
      setStatus("locked");
      lastActivity.current = Date.now();
      sessionStart.current = Date.now();
      if (reason) notify(reason, "info");
    },
    [notify]
  );

  /* ---------- auth ---------- */
  const createVault = useCallback(
    async (password: string, opts: { hint: string; ownerName: string; demo: boolean }) => {
      setBusy("در حال ساخت گاوصندوق رمزنگاری‌شده…");
      try {
        const salt = newSalt();
        const iterations = DEFAULT_ITERATIONS;
        const key = await deriveKey(password, fromB64(salt), iterations);
        const base = emptyVault();
        const withData: Vault = opts.demo
          ? { ...(demoVault() as Vault), createdAt: base.createdAt, updatedAt: Date.now() }
          : base;
        withData.settings = {
          ...withData.settings,
          ownerName: opts.ownerName || withData.settings.ownerName,
        };
        withData.events = [
          { id: uid("ev"), ts: Date.now(), type: "security", msg: "گاوصندوق ایجاد شد (AES-GCM-256 + PBKDF2)" },
          ...withData.events,
        ];
        const cipher = await encryptJson(key, withData);
        const m: VaultMeta = {
          v: 1,
          salt,
          iterations,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          hint: opts.hint || "",
          failed: 0,
          lockUntil: 0,
          algo: ALGO,
        };
        storage.meta = m;
        storage.cipher = cipher;
        keyRef.current = key;
        setMeta(m);
        setVault(withData);
        sessionStart.current = Date.now();
        setStatus("unlocked");
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const unlock = useCallback(
    async (password: string) => {
      const m = storage.meta;
      const cipher = storage.cipher;
      if (!m || !cipher) {
        setStatus(storage.meta ? "locked" : "setup");
        return { ok: false };
      }
      if (m.lockUntil > Date.now()) {
        return { ok: false, waitSec: Math.ceil((m.lockUntil - Date.now()) / 1000) };
      }
      setBusy("در حال رمزگشایی داده‌ها…");
      try {
        const key = await deriveKey(password, fromB64(m.salt), m.iterations);
        const data = await decryptJson<Vault>(key, cipher);
        keyRef.current = key;
        setVault(data);
        lastActivity.current = Date.now();
        sessionStart.current = Date.now();
        setStatus("unlocked");
        const cleared = { ...m, failed: 0, lockUntil: 0 };
        storage.meta = cleared;
        setMeta(cleared);
        return { ok: true };
      } catch {
        const failed = (m.failed || 0) + 1;
        const delaySec = Math.min(900, Math.round(5 * Math.pow(2, Math.min(failed, 6))));
        const updated: VaultMeta = { ...m, failed, lockUntil: Date.now() + delaySec * 1000 };
        storage.meta = updated;
        setMeta(updated);
        return { ok: false, waitSec: delaySec };
      } finally {
        setBusy(null);
      }
    },
    []
  );

  /* ---------- CRUD ---------- */
  const updateSettings = useCallback(
    (patch: Partial<Settings>, ev?: EvSpec) => {
      mutate((v) => {
        v.settings = { ...v.settings, ...patch };
      }, ev);
    },
    [mutate]
  );

  const upsertBank = useCallback(
    (b: Bank) => {
      mutate(
        (v) => {
          const i = v.banks.findIndex((x) => x.id === b.id);
          if (i >= 0) v.banks[i] = b;
          else v.banks.unshift(b);
        },
        { type: "edit", msg: `بانک «${b.name}» ${storage.meta ? "ذخیره شد" : "ثبت شد"}` }
      );
    },
    [mutate]
  );

  const removeBank = useCallback(
    (id: string) => {
      const name = vault?.banks.find((b) => b.id === id)?.name || "";
      mutate(
        (v) => {
          v.banks = v.banks.filter((b) => b.id !== id);
          const debtIds = v.debts.filter((d) => d.bankId === id).map((d) => d.id);
          v.debts = v.debts.filter((d) => d.bankId !== id);
          v.payments = v.payments.filter((p) => p.bankId !== id);
          v.events = [
            {
              id: uid("ev"),
              ts: Date.now(),
              type: "delete" as const,
              msg: `بانک «${name}» و ${debtIds.length} بدهی مرتبط حذف شد`,
            },
            ...v.events,
          ].slice(0, MAX_EVENTS);
        },
        { type: "delete", msg: `حذف بانک «${name}»` }
      );
    },
    [mutate, vault]
  );

  const upsertDebt = useCallback(
    (d: Debt) => {
      mutate(
        (v) => {
          const i = v.debts.findIndex((x) => x.id === d.id);
          if (i >= 0) v.debts[i] = d;
          else v.debts.unshift(d);
        },
        { type: "edit", msg: `بدهی «${d.title}» ذخیره شد` }
      );
    },
    [mutate]
  );

  const removeDebt = useCallback(
    (id: string) => {
      const title = vault?.debts.find((d) => d.id === id)?.title || "";
      mutate(
        (v) => {
          v.debts = v.debts.filter((d) => d.id !== id);
          v.payments = v.payments.filter((p) => p.debtId !== id);
        },
        { type: "delete", msg: `حذف بدهی «${title}»` }
      );
    },
    [mutate, vault]
  );

  const upsertPayment = useCallback(
    (p: Payment, opts?: { bumpInstallment?: boolean; prevDebtId?: string }) => {
      mutate(
        (v) => {
          const i = v.payments.findIndex((x) => x.id === p.id);
          if (i >= 0) v.payments[i] = p;
          else v.payments.unshift(p);
          if (p.debtId && p.kind === "installment") {
            const debt = v.debts.find((d) => d.id === p.debtId);
            if (debt && opts?.bumpInstallment !== false) {
              const wasNew = i < 0;
              if (wasNew) debt.paidCount = Math.min(debt.count, (debt.paidCount || 0) + 1);
              if (debt.paidCount >= debt.count) debt.status = "done";
            }
          }
        },
        { type: "pay", msg: `پرداخت ${p.amount.toLocaleString("en-US")} ثبت شد` }
      );
    },
    [mutate]
  );

  const removePayment = useCallback(
    (id: string) => {
      const target = vault?.payments.find((p) => p.id === id);
      mutate(
        (v) => {
          v.payments = v.payments.filter((p) => p.id !== id);
          if (target?.debtId && target.kind === "installment") {
            const debt = v.debts.find((d) => d.id === target.debtId);
            if (debt) {
              debt.paidCount = Math.max(0, (debt.paidCount || 0) - 1);
              if (debt.status === "done") debt.status = "active";
            }
          }
        },
        { type: "delete", msg: "حذف یک پرداخت" }
      );
    },
    [mutate, vault]
  );

  /* ---------- password / backup ---------- */
  const changePassword = useCallback(
    async (current: string, next: string, hint: string) => {
      const m = storage.meta;
      const cipher = storage.cipher;
      if (!m || !cipher || !vault) return false;
      setBusy("در حال تغییر رمز و رمزنگاری مجدد…");
      try {
        const oldKey = await deriveKey(current, fromB64(m.salt), m.iterations);
        await decryptJson<Vault>(oldKey, cipher);
        const salt = newSalt();
        const iterations = DEFAULT_ITERATIONS;
        const newKey = await deriveKey(next, fromB64(salt), iterations);
        const data: Vault = { ...vault, updatedAt: Date.now() };
        data.events = [
          {
            id: uid("ev"),
            ts: Date.now(),
            type: "security" as const,
            msg: "رمز عبور تغییر کرد و کلید رمزنگاری تازه‌سازی شد",
          },
          ...data.events,
        ].slice(0, MAX_EVENTS);
        storage.cipher = await encryptJson(newKey, data);
        const updated: VaultMeta = { ...m, salt, iterations, hint, failed: 0, lockUntil: 0, updatedAt: Date.now() };
        storage.meta = updated;
        keyRef.current = newKey;
        setMeta(updated);
        setVault(data);
        return true;
      } catch {
        return false;
      } finally {
        setBusy(null);
      }
    },
    [vault]
  );

  const exportEncrypted = useCallback(
    async (password: string) => {
      if (!vault) return;
      setBusy("در حال ساخت فایل پشتیبان رمزنگاری‌شده…");
      try {
        const salt = newSalt();
        const iterations = 200_000;
        const key = await deriveKey(password, fromB64(salt), iterations);
        const cipher = await encryptJson(key, vault);
        const file: BackupFile = {
          app: "PersonalFinance",
          v: 1,
          createdAt: Date.now(),
          algo: ALGO,
          iterations,
          salt,
          cipher,
          counts: {
            banks: vault.banks.length,
            debts: vault.debts.length,
            payments: vault.payments.length,
          },
        };
        downloadFile(makeBackupName("enc"), JSON.stringify(file, null, 2));
        mutate(() => {}, { type: "backup", msg: "پشتیبان رمزنگاری‌شده تهیه شد" });
      } finally {
        setBusy(null);
      }
    },
    [vault, mutate]
  );

  const restoreEncrypted = useCallback(
    async (file: File, password: string) => {
      setBusy("در حال بازیابی…");
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as BackupFile;
        if (!parsed?.cipher?.iv || !parsed?.salt) return { ok: false, msg: "ساختار فایل پشتیبان معتبر نیست" };
        const key = await deriveKey(password, fromB64(parsed.salt), parsed.iterations || DEFAULT_ITERATIONS);
        const data = await decryptJson<Vault>(key, parsed.cipher);
        if (!data?.banks) return { ok: false, msg: "رمز فایل اشتباه است یا فایل خراب شده" };
        const key2 = keyRef.current;
        if (!key2) return { ok: false, msg: "نشست قفل است" };
        storage.cipher = await encryptJson(key2, data);
        setVault(data);
        mutate(() => {}, { type: "restore", msg: "بازیابی از پشتیبان انجام شد" });
        return { ok: true, msg: "بازیابی با موفقیت انجام شد" };
      } catch {
        return { ok: false, msg: "رمز فایل اشتباه است یا فایل قابل خواندن نیست" };
      } finally {
        setBusy(null);
      }
    },
    [mutate]
  );

  const exportPlain = useCallback(() => {
    if (!vault) return;
    downloadFile(makeBackupName("open"), JSON.stringify(vault, null, 2));
    mutate(() => {}, { type: "backup", msg: "خروجی متنی (رمزنشده) تهیه شد" });
  }, [vault, mutate]);

  const restorePlain = useCallback(
    async (file: File) => {
      try {
        const data = JSON.parse(await file.text()) as Vault;
        if (!data?.banks) return { ok: false, msg: "فایل انتخابی یک خروجی معتبر نیست" };
        const key2 = keyRef.current;
        if (!key2) return { ok: false, msg: "نشست قفل است" };
        storage.cipher = await encryptJson(key2, data);
        setVault(data);
        mutate(() => {}, { type: "restore", msg: "بازیابی از فایل متنی انجام شد" });
        return { ok: true, msg: "بازیابی انجام شد" };
      } catch {
        return { ok: false, msg: "خواندن فایل ناموفق بود" };
      }
    },
    [mutate]
  );

  const loadDemo = useCallback(() => {
    const demo = demoVault() as Vault;
    mutate(
      (v) => {
        v.banks = demo.banks;
        v.debts = demo.debts;
        v.payments = demo.payments;
        v.settings = { ...v.settings, ownerName: v.settings.ownerName || "کاربر" };
      },
      { type: "system", msg: "داده نمونه بارگذاری شد" }
    );
  }, [mutate]);

  const wipeAll = useCallback(() => {
    keyRef.current = null;
    storage.wipe();
    setVault(null);
    setMeta(null);
    setStatus("setup");
    notify("همه داده‌ها از این دستگاه پاک شد", "ok");
  }, [notify]);

  const value = useMemo<Ctx>(
    () => ({
      status,
      meta,
      vault,
      settings: vault?.settings ?? null,
      busy,
      saving,
      toasts,
      notify,
      dismiss,
      createVault,
      unlock,
      lock: doLock,
      mutate,
      updateSettings,
      upsertBank,
      removeBank,
      upsertDebt,
      removeDebt,
      upsertPayment,
      removePayment,
      changePassword,
      exportEncrypted,
      restoreEncrypted,
      exportPlain,
      restorePlain,
      loadDemo,
      wipeAll,
      lockInSec,
      sessionMinutes,
    }),
    [
      status,
      meta,
      vault,
      busy,
      saving,
      toasts,
      notify,
      dismiss,
      createVault,
      unlock,
      doLock,
      mutate,
      updateSettings,
      upsertBank,
      removeBank,
      upsertDebt,
      removeDebt,
      upsertPayment,
      removePayment,
      changePassword,
      exportEncrypted,
      restoreEncrypted,
      exportPlain,
      restorePlain,
      loadDemo,
      wipeAll,
      lockInSec,
      sessionMinutes,
    ]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

