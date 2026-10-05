import { useMemo, useRef, useState } from "react";
import { useApp } from "../store";
import {
  Amount,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  SectionTitle,
  Segmented,
  Select,
  Toggle,
  useConfirm,
} from "../components/ui";
import { Icon } from "../components/Icons";
import { BANK_COLORS, type Settings as TSettings } from "../types";
import { scorePassword, toFaDigits } from "../lib/format";
import { isoToJalaliText } from "../lib/jalali";
import { storage } from "../lib/storage";
import { useInstall } from "../pwa";

export default function Settings() {
  const {
    vault,
    settings,
    meta,
    updateSettings,
    changePassword,
    exportEncrypted,
    restoreEncrypted,
    exportPlain,
    restorePlain,
    loadDemo,
    wipeAll,
    notify,
    sessionMinutes,
    lockInSec,
    saving,
  } = useApp();
  const { ask, node } = useConfirm();
  const { canInstall, install, installed } = useInstall();
  const fileRef = useRef<HTMLInputElement>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [hint, setHint] = useState(meta?.hint || "");
  const [pwErr, setPwErr] = useState("");
  const [bakOpen, setBakOpen] = useState(false);
  const [bakPw, setBakPw] = useState("");
  const [resPw, setResPw] = useState("");
  const [resFile, setResFile] = useState<File | null>(null);

  const strength = useMemo(() => scorePassword(next), [next]);
  const events = vault?.events || [];
  const sizeKb = (storage.usage() / 1024).toFixed(1);

  const S = (patch: Partial<TSettings>) => updateSettings(patch);

  const doChangePw = async () => {
    setPwErr("");
    if (next.length < 6) return setPwErr("رمز جدید حداقل ۶ کاراکتر باشد");
    if (next !== next2) return setPwErr("تکرار رمز مطابقت ندارد");
    const ok = await changePassword(cur, next, hint);
    if (!ok) return setPwErr("رمز فعلی اشتباه است");
    setPwOpen(false);
    setCur("");
    setNext("");
    setNext2("");
    notify("رمز عبور با موفقیت تغییر کرد", "ok");
  };

  const doExport = async () => {
    if (bakPw.length < 6) return notify("رمز فایل پشتیبان حداقل ۶ کاراکتر باشد", "err");
    await exportEncrypted(bakPw);
    setBakPw("");
    setBakOpen(false);
    notify("فایل پشتیبان رمزنگاری‌شده دانلود شد", "ok");
  };

  const doRestore = async () => {
    if (!resFile) return notify("فایل پشتیبان را انتخاب کنید", "err");
    const r = await restoreEncrypted(resFile, resPw);
    notify(r.msg, r.ok ? "ok" : "err");
    if (r.ok) {
      setBakOpen(false);
      setResFile(null);
      setResPw("");
    }
  };

  return (
    <div className="space-y-5">
      {/* ---------- وضعیت امنیتی ---------- */}
      <Card>
        <SectionTitle
          icon="shieldcheck"
          title="وضعیت امنیتی"
          sub="رمزنگاری، نشست و سلامت داده‌ها"
          action={<Badge tone="ok">محافظت‌شده</Badge>}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="الگوریتم" value="AES-GCM-256" desc={meta?.algo || "PBKDF2-SHA256"} icon="shield" />
          <Stat label="دوره مشتق کلید" value={`${toFaDigits(String(Math.round((meta?.iterations || 0) / 1000)))}K`} desc="PBKDF2 iterations" icon="key" />
          <Stat
            label="قفل خودکار"
            value={`${toFaDigits(String(settings?.autoLockMin ?? 5))} دقیقه`}
            desc={`${toFaDigits(String(Math.max(0, Math.floor(lockInSec / 60))))}:${toFaDigits(
              String(lockInSec % 60).padStart(2, "0")
            )} باقی‌مانده`}
            icon="clock"
          />
          <Stat
            label="حجم داده روی دستگاه"
            value={`${toFaDigits(sizeKb)} کیلوبایت`}
            desc={`${toFaDigits(String(events.length))} رویداد ثبت‌شده`}
            icon="file"
          />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button icon="key" onClick={() => setPwOpen(true)}>
            تغییر رمز عبور
          </Button>
          <Button variant="soft" icon="download" onClick={() => setBakOpen(true)}>
            پشتیبان / بازیابی
          </Button>
          <Button
            variant="soft"
            icon="lock"
            onClick={() =>
              ask(
                "پاک کردن همه داده‌ها؟",
                "گاوصندوق این دستگاه حذف می‌شود. اگر فایل پشتیبان ندارید، اطلاعات بازگشت‌پذیر نیست.",
                () => wipeAll(),
                true
              )
            }
          >
            پاک‌سازی کامل دستگاه
          </Button>
        </div>
        <p className="num mt-3 text-[11px] text-muted">
          زمان نشست: {toFaDigits(String(sessionMinutes))} دقیقه · وضعیت ذخیره:{" "}
          {saving === "saving" ? "در حال رمزنگاری…" : saving === "saved" ? "ذخیره شد" : "آماده"} · تاریخ گاوصندوق:{" "}
          {isoToJalaliText(new Date(vault?.createdAt || Date.now()).toISOString().slice(0, 10))}
        </p>
      </Card>

      {/* ---------- تنظیمات عمومی ---------- */}
      <Card>
        <SectionTitle icon="sliders" title="تنظیمات برنامه" sub="نمایش، تم و رفتار قفل" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نام شما">
            <Input
              value={settings?.ownerName || ""}
              onChange={(e) => S({ ownerName: e.target.value })}
              maxLength={24}
              placeholder="برای خوش‌آمدگویی و گزارش‌ها"
            />
          </Field>
          <Field label="واحد پول">
            <Select value={settings?.currency} onChange={(e) => S({ currency: e.target.value })}>
              {["تومان", "ریال", "دلار", "یورو", "درهم"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="تم برنامه">
            <Segmented
              value={settings?.theme ?? "dark"}
              onChange={(theme) => S({ theme })}
              options={[
                { value: "dark", label: "تیره", icon: "moon" },
                { value: "light", label: "روشن", icon: "sun" },
              ]}
            />
          </Field>
          <Field label="قالب اعداد">
            <Segmented
              value={settings?.digits ?? "fa"}
              onChange={(digits) => S({ digits })}
              options={[
                { value: "fa", label: "فارسی ۱۲۳" },
                { value: "en", label: "لاتین 123" },
              ]}
            />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="رنگ اصلی تم">
            <div className="flex flex-wrap gap-2">
              {BANK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => S({ accent: c })}
                  className="h-9 w-9 rounded-xl transition"
                  style={{ background: c, outline: settings?.accent === c ? "2px solid var(--c-ink)" : "none", outlineOffset: 2 }}
                  aria-label={c}
                />
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={`قفل خودکار: ${toFaDigits(String(settings?.autoLockMin ?? 5))} دقیقه`}>
            <input
              type="range"
              min={1}
              max={30}
              value={settings?.autoLockMin ?? 5}
              onChange={(e) => S({ autoLockMin: +e.target.value })}
              className="w-full"
            />
          </Field>
          <Field label={`هشدار سررسید: ${toFaDigits(String(settings?.warnDays ?? 5))} روز قبل`}>
            <input
              type="range"
              min={1}
              max={20}
              value={settings?.warnDays ?? 5}
              onChange={(e) => S({ warnDays: +e.target.value })}
              className="w-full"
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Toggle
            checked={!!settings?.lockOnHide}
            onChange={(v) => S({ lockOnHide: v })}
            label="قفل خودکار هنگام ترک برنامه"
            desc="اگر ۴۵ ثانیه از برنامه خارج شوید، قفل می‌شود"
          />
          <Toggle
            checked={!!settings?.hideAmounts}
            onChange={(v) => S({ hideAmounts: v })}
            label="مخفی‌کردن مبالغ (حریم خصوصی)"
            desc="مناسب نمایش دادن صفحه به دیگران"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {canInstall && (
            <Button icon="download" onClick={install}>
              نصب برنامه روی دستگاه
            </Button>
          )}
          {installed && <Badge tone="ok">برنامه به‌صورت نصب‌شده اجرا می‌شود</Badge>}
          <Button variant="soft" icon="sparkles" onClick={() => ask("بارگذاری داده نمونه؟", "بانک‌ها و بدهی‌های فعلی با داده نمونه جایگزین می‌شوند.", () => loadDemo(), false)}>
            بارگذاری داده نمونه
          </Button>
        </div>
      </Card>

      {/* ---------- راهنمای امنیتی ---------- */}
      <Card>
        <SectionTitle icon="info" title="این برنامه چطور امن است؟" sub="خلاصه‌ای از معماری امنیتی" />
        <ul className="space-y-2.5 text-[12px] leading-6 text-muted">
          {[
            "کلید رمزنگاری از رمز عبور شما با PBKDF2-SHA256 (۳۱۰٬۰۰۰ دور) ساخته می‌شود و هرگز روی دیسک ذخیره نمی‌شود.",
            "کل داده‌ها با AES-GCM-256 رمزنگاری و در حافظه محلی مرورگر (localStorage) نگه‌داری می‌شود.",
            "در قفل خودکار، کلید از حافظه پاک می‌شود و ورود مجدد به رمز عبور نیاز دارد.",
            "پس از چند ورود ناموفق، ورود برای مدتی قفل می‌شود (تا ۱۵ دقیقه).",
            "فایل پشتیبان هم با AES-GCM رمزنگاری می‌شود؛ بدون رمز فایل، خواندن آن ناممکن است.",
            "هیچ درخواستی به سرور خارجی ارسال نمی‌شود؛ برنامه کاملاً آفلاین است.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <Icon name="check" size={15} className="mt-1 shrink-0 text-ok" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* ---------- رویدادها ---------- */}
      <Card>
        <SectionTitle icon="file" title="گزارش رویدادها" sub="آخرین تغییرات و عملیات امنیتی (رمزنگاری‌شده)" />
        {events.length === 0 ? (
          <EmptyState icon="file" title="رویدادی ثبت نشده" />
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto pl-1">
            {events.slice(0, 80).map((e) => (
              <li key={e.id} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface2/40 p-2.5">
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                    e.type === "security"
                      ? "bg-brand/15 text-brand"
                      : e.type === "delete"
                        ? "bg-bad/12 text-bad"
                        : e.type === "pay"
                          ? "bg-ok/12 text-ok"
                          : "bg-surface2 text-muted"
                  }`}
                >
                  <Icon
                    name={
                      e.type === "security"
                        ? "shield"
                        : e.type === "delete"
                          ? "trash"
                          : e.type === "pay"
                            ? "card"
                            : e.type === "backup" || e.type === "restore"
                              ? "download"
                              : "info"
                    }
                    size={14}
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold">{e.msg}</p>
                  <p className="num text-[10px] text-muted">
                    {isoToJalaliText(new Date(e.ts).toISOString().slice(0, 10))} ·{" "}
                    {new Date(e.ts).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------- مودال تغییر رمز ---------- */}
      <Modal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="تغییر رمز عبور"
        icon="key"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPwOpen(false)}>
              انصراف
            </Button>
            <Button icon="check" onClick={doChangePw}>
              تغییر رمز
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="رمز عبور فعلی">
            <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
          </Field>
          <Field label="رمز عبور جدید">
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <div className="flex items-center gap-2">
            <div className="flex h-1.5 flex-1 gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="h-full flex-1 rounded-full" style={{ background: i < strength.score ? strength.color : "var(--c-line)" }} />
              ))}
            </div>
            <span className="w-20 text-left text-[11px] font-bold" style={{ color: strength.color }}>
              {strength.label}
            </span>
          </div>
          <Field label="تکرار رمز جدید">
            <Input type="password" value={next2} onChange={(e) => setNext2(e.target.value)} />
          </Field>
          <Field label="راهنمای رمز" hint="روی همین دستگاه ذخیره می‌شود">
            <Input value={hint} onChange={(e) => setHint(e.target.value)} maxLength={40} />
          </Field>
          {pwErr && <p className="text-xs font-bold text-bad">{pwErr}</p>}
          <p className="rounded-xl border border-line bg-surface2/40 p-3 text-[11px] leading-6 text-muted">
            با تغییر رمز، کل داده‌ها با کلید تازه دوباره رمزنگاری می‌شوند و فایل‌های پشتیبان قبلی با رمز قدیمی‌شان
            معتبر می‌مانند.
          </p>
        </div>
      </Modal>

      {/* ---------- مودال پشتیبان/بازیابی ---------- */}
      <Modal
        open={bakOpen}
        onClose={() => setBakOpen(false)}
        title="پشتیبان‌گیری و بازیابی"
        icon="download"
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setBakOpen(false)}>
              بستن
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-ok/30 bg-ok/[0.07] p-3.5">
            <p className="flex items-center gap-2 text-sm font-bold text-ok">
              <Icon name="shieldcheck" size={16} /> پشتیبان رمزنگاری‌شده (توصیه‌شده)
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="رمز فایل پشتیبان" hint="می‌تواند متفاوت از رمز ورود باشد">
                <Input type="password" value={bakPw} onChange={(e) => setBakPw(e.target.value)} />
              </Field>
              <Button icon="download" onClick={doExport}>
                دانلود پشتیبان
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface2/40 p-3.5">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Icon name="upload" size={16} className="text-brand" /> بازیابی از فایل پشتیبان
            </p>
            <div className="mt-3 grid gap-3">
              <Field label="فایل پشتیبان (.json)">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => setResFile(e.target.files?.[0] || null)}
                  className="inp file:mr-2 file:rounded-lg file:border-0 file:bg-surface2 file:px-2 file:py-1 file:text-xs"
                />
              </Field>
              <Field label="رمز فایل پشتیبان">
                <Input type="password" value={resPw} onChange={(e) => setResPw(e.target.value)} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button icon="upload" onClick={doRestore}>
                  بازیابی داده‌ها
                </Button>
                <Button
                  variant="danger"
                  icon="alert"
                  onClick={() =>
                    ask(
                      "بازکردن فایل متنی (رمزنشده)؟",
                      "این گزینه فقط برای فایل‌های خروجی قدیمی و بدون رمز است و امنیت ندارد.",
                      async () => {
                        if (!resFile) return notify("ابتدا فایل را انتخاب کنید", "err");
                        const r = await restorePlain(resFile);
                        notify(r.msg, r.ok ? "ok" : "err");
                      },
                      false
                    )
                  }
                >
                  بازیابی فایل باز
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-warn/30 bg-warn/[0.07] p-3.5">
            <p className="flex items-center gap-2 text-sm font-bold text-warn">
              <Icon name="alert" size={16} /> خروجی باز (بدون رمزنگاری)
            </p>
            <p className="mt-1.5 text-[11px] leading-6 text-muted">
              این خروجی تمام اطلاعات حساس را به‌صورت متنی باز ذخیره می‌کند. فقط برای انتقال یک‌باره استفاده کنید و
              پس از آن فایل را حذف کنید.
            </p>
            <Button
              variant="soft"
              className="mt-3"
              icon="file"
              onClick={() =>
                ask(
                  "ساخت خروجی باز؟",
                  "فایل شامل شماره کارت‌ها و مبالغ بدون رمزنگاری است. مطمئنید؟",
                  () => {
                    exportPlain();
                    notify("فایل باز دانلود شد؛ آن را امن نگه دارید", "info");
                  },
                  true
                )
              }
            >
              دانلود خروجی باز
            </Button>
          </div>

          <div className="rounded-xl border border-line bg-surface2/40 p-3.5 text-[11px] leading-6 text-muted">
            <p className="font-bold text-ink">توصیه‌ها</p>
            <p>
              • ماهانه یک پشتیبان بگیرید و فایل را در جای امن (مثلاً حافظه رمزدار) نگه دارید.
              <br />• اگر رمز ورود را فراموش کردید، تنها راه بازیابی، همین فایل پشتیبان است.
              <br />• حجم فعلی داده‌های رمزنگاری‌شده: <Amount value={0} className="hidden" />
              {toFaDigits(sizeKb)} کیلوبایت.
            </p>
          </div>
        </div>
      </Modal>

      {node}
    </div>
  );
}

function Stat({
  label,
  value,
  desc,
  icon,
}: {
  label: string;
  value: string;
  desc: string;
  icon: "shield" | "key" | "clock" | "file";
}) {
  return (
    <div className="rounded-xl border border-line bg-surface2/40 p-3">
      <div className="flex items-center gap-2 text-[11px] font-bold text-muted">
        <Icon name={icon} size={14} className="text-brand" />
        {label}
      </div>
      <p className="num mt-1 text-sm font-extrabold">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted">{desc}</p>
    </div>
  );
}
