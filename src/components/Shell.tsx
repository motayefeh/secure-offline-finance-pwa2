import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { Icon, type IconName } from "./Icons";
import { IconButton, Toaster } from "./ui";
import { useApp } from "../store";
import { storage } from "../lib/storage";
import { useInstall, useOnline } from "../pwa";
import Dashboard from "../screens/Dashboard";
import Banks from "../screens/Banks";
import Debts from "../screens/Debts";
import Payments from "../screens/Payments";
import Reports from "../screens/Reports";
import Settings from "../screens/Settings";
import { isoToJalaliText, todayJalaali, J_MONTHS } from "../lib/jalali";
import { toFaDigits } from "../lib/format";

export type Tab = "dashboard" | "banks" | "debts" | "payments" | "reports" | "settings";

export const TABS: { id: Tab; label: string; icon: IconName; short: string }[] = [
  { id: "dashboard", label: "داشبورد", icon: "target", short: "خانه" },
  { id: "banks", label: "بانک‌ها", icon: "bank", short: "بانک" },
  { id: "debts", label: "بدهی و اقساط", icon: "receipt", short: "اقساط" },
  { id: "payments", label: "پرداخت‌ها", icon: "card", short: "پرداخت" },
  { id: "reports", label: "گزارش‌ها", icon: "chart", short: "گزارش" },
  { id: "settings", label: "تنظیمات", icon: "sliders", short: "تنظیم" },
];

const TITLES: Record<Tab, { title: string; sub: string }> = {
  dashboard: { title: "داشبورد مالی", sub: "نمای کلی وضعیت بدهی‌ها و اقساط" },
  banks: { title: "بانک‌ها و حساب‌ها", sub: "مدیریت حساب‌ها، کارت‌ها و اطلاعات تماس" },
  debts: { title: "بدهی‌ها و اقساط", sub: "وام، چک، اقساط و قرض‌ها" },
  payments: { title: "پرداخت‌ها", sub: "تاریخچه واریزی‌ها و اقساط پرداخت‌شده" },
  reports: { title: "گزارش‌ها", sub: "چه مقدار، به کدام بانک و تا کِی" },
  settings: { title: "تنظیمات و امنیت", sub: "رمز عبور، قفل خودکار، پشتیبان‌گیری" },
};

export default function Shell() {
  const { vault, settings, lock, saving, busy, updateSettings, sessionMinutes, lockInSec } = useApp();
  const [tab, setTab] = useState<Tab>(() => (storage.ui.tab as Tab) || "dashboard");
  const [menu, setMenu] = useState(false);
  const { canInstall, install } = useInstall();
  const online = useOnline();
  const t = todayJalaali();

  useEffect(() => {
    storage.ui = { ...storage.ui, tab };
  }, [tab]);

  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab]);

  const go = (id: Tab) => {
    setTab(id);
    if (window.location.hash !== `#${id}`) history.replaceState(null, "", `#${id}`);
  };

  /* ناوبری با hash (از دکمه‌های میانبر داشبورد) */
  useEffect(() => {
    const apply = () => {
      const id = window.location.hash.replace("#", "") as Tab;
      if (TABS.some((x) => x.id === id)) setTab(id);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const Page = { dashboard: Dashboard, banks: Banks, debts: Debts, payments: Payments, reports: Reports, settings: Settings }[tab];

  return (
    <div className="min-h-dvh lg:flex lg:flex-row-reverse">
      {/* ---------- سایدبار دسکتاپ ---------- */}
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-l border-line bg-app/70 p-4 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 px-1">
          <span className="grid h-11 w-11 place-items-center rounded-2xl brand-grad text-white shadow-lg">
            <Icon name="wallet" size={22} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">PersonalFinance</p>
            <p className="truncate text-[11px] text-muted">
              {settings?.ownerName ? `سلام ${settings.ownerName} 👋` : "گاوصندوق مالی من"}
            </p>
          </div>
        </div>

        <nav className="mt-6 space-y-1">
          {TABS.map((x) => (
            <button
              key={x.id}
              onClick={() => go(x.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                tab === x.id
                  ? "brand-grad text-white shadow-[0_10px_25px_-12px_var(--c-brand)]"
                  : "text-muted hover:bg-surface2 hover:text-ink"
              )}
            >
              <Icon name={x.icon} size={18} />
              {x.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-line bg-surface2/50 p-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-muted">
              <Icon name="clock" size={14} />
              قفل خودکار
            </div>
            <p className="num mt-1 text-[11px] text-muted">
              {toFaDigits(String(Math.max(0, Math.floor(lockInSec / 60))))}:{toFaDigits(String(lockInSec % 60).padStart(2, "0"))} تا قفل
            </p>
            <p className="num mt-0.5 text-[10px] text-muted/70">
              مدت نشست: {toFaDigits(String(sessionMinutes))} دقیقه
            </p>
          </div>

          {canInstall && (
            <button
              onClick={install}
              className="flex w-full items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2.5 text-xs font-bold text-brand transition hover:bg-brand/20"
            >
              <Icon name="download" size={16} />
              نصب برنامه
            </button>
          )}

          <button
            onClick={() => lock("نشست با موفقیت قفل شد")}
            className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface2/50 px-3 py-2.5 text-xs font-bold text-muted transition hover:text-bad"
          >
            <Icon name="lock" size={16} />
            قفل کردن گاوصندوق
          </button>
          <p className="flex items-center justify-center gap-1 text-[10px] text-muted/70">
            <Icon name={online ? "shieldcheck" : "shield"} size={12} />
            {online ? "آفلاین‌پسند · ذخیره محلی" : "حالت آفلاین فعال"}
          </p>
        </div>
      </aside>

      {/* ---------- محتوا ---------- */}
      <main className="min-w-0 flex-1 pb-24 lg:pb-8">
        {/* هدر موبایل/دسکتاپ */}
        <header className="sticky top-0 z-30 border-b border-line bg-app/80 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <button className="lg:hidden" onClick={() => setMenu(true)} aria-label="منو">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface2/60">
                  <Icon name="menu" size={18} />
                </span>
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-extrabold sm:text-lg">{TITLES[tab].title}</h1>
                <p className="truncate text-[11px] text-muted">
                  {TITLES[tab].sub} · {toFaDigits(String(t.jd))} {J_MONTHS[t.jm - 1]} {toFaDigits(String(t.jy))}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "hidden items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[10px] font-bold sm:flex",
                  saving === "saving" ? "text-warn" : saving === "saved" ? "text-ok" : "text-muted"
                )}
              >
                <Icon name={saving === "saving" ? "refresh" : "check"} size={12} className={saving === "saving" ? "spin" : ""} />
                {saving === "saving" ? "در حال رمزنگاری…" : saving === "saved" ? "ذخیره شد" : "همگام محلی"}
              </span>
              <IconButton
                icon={settings?.hideAmounts ? "eyeoff" : "eye"}
                label="مخفی‌کردن مبالغ"
                onClick={() => updateSettings({ hideAmounts: !settings?.hideAmounts })}
                className={settings?.hideAmounts ? "text-brand" : ""}
              />
              <IconButton
                icon={settings?.theme === "dark" ? "sun" : "moon"}
                label="تغییر تم"
                onClick={() => updateSettings({ theme: settings?.theme === "dark" ? "light" : "dark" })}
              />
              <IconButton icon="lock" label="قفل کردن" onClick={() => lock("نشست قفل شد")} className="hidden sm:grid" />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-5">
          <div key={tab} className="anim-fade">
            <Page />
          </div>
          <p className="mt-8 text-center text-[10px] leading-6 text-muted/70">
            همه داده‌ها با AES-GCM-256 روی همین دستگاه رمزنگاری و ذخیره شده‌اند · آخرین تغییر:{" "}
            {vault ? isoToJalaliText(new Date(vault.updatedAt).toISOString().slice(0, 10)) : "—"}
          </p>
        </div>
      </main>

      {/* ---------- منوی کشویی موبایل ---------- */}
      {menu && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenu(false)} />
          <div className="anim-pop absolute inset-y-0 right-0 w-[78%] max-w-xs border-l border-line bg-app2/95 p-4">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl brand-grad text-white">
                  <Icon name="wallet" size={20} />
                </span>
                <p className="text-sm font-black">PersonalFinance</p>
              </div>
              <IconButton icon="x" label="بستن" onClick={() => setMenu(false)} />
            </div>
            <nav className="space-y-1">
              {TABS.map((x) => (
                <button
                  key={x.id}
                  onClick={() => go(x.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition",
                    tab === x.id ? "brand-grad text-white" : "text-muted hover:bg-surface2"
                  )}
                >
                  <Icon name={x.icon} size={18} />
                  {x.label}
                </button>
              ))}
            </nav>
            <div className="mt-6 space-y-2">
              {canInstall && (
                <button
                  onClick={install}
                  className="flex w-full items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-3 py-3 text-xs font-bold text-brand"
                >
                  <Icon name="download" size={16} /> نصب روی دستگاه
                </button>
              )}
              <button
                onClick={() => lock("نشست قفل شد")}
                className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface2/50 px-3 py-3 text-xs font-bold text-muted"
              >
                <Icon name="lock" size={16} /> قفل کردن گاوصندوق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- ناوبری پایین موبایل ---------- */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-app/90 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="no-scrollbar flex items-stretch justify-between">
          {TABS.map((x) => (
            <button
              key={x.id}
              onClick={() => go(x.id)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px] font-bold transition",
                tab === x.id ? "text-brand" : "text-muted"
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-xl transition",
                  tab === x.id ? "bg-brand/15" : ""
                )}
              >
                <Icon name={x.icon} size={18} />
              </span>
              {x.short}
            </button>
          ))}
        </div>
      </nav>

      <Toaster />

      {busy && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-app/70 backdrop-blur-sm">
          <div className="glass flex items-center gap-3 rounded-2xl px-5 py-4">
            <span className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent spin" />
            <p className="text-sm font-bold">{busy}</p>
          </div>
        </div>
      )}
    </div>
  );
}
