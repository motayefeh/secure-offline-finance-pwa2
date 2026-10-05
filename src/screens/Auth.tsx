import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store";
import { Button, Card, Field, Input, Toggle } from "../components/ui";
import { Icon } from "../components/Icons";
import { scorePassword, toFaDigits } from "../lib/format";
import { decryptJson, deriveKey, encryptJson, fromB64, newSalt, DEFAULT_ITERATIONS } from "../lib/crypto";
import { ALGO, storage, type BackupFile } from "../lib/storage";

const FEATURES: { icon: "shieldcheck" | "lock" | "wallet" | "chart" | "download" | "sparkles"; title: string; desc: string }[] = [
  { icon: "shieldcheck", title: "رمزنگاری AES-GCM-256", desc: "کلید از رمز عبور با PBKDF2 (۳۱۰٬۰۰۰ دور) ساخته می‌شود" },
  { icon: "lock", title: "قفل خودکار هوشمند", desc: "بعد از مدت‌زمان بدون فعالیت، کلید از حافظه پاک می‌شود" },
  { icon: "wallet", title: "بانک‌ها، بدهی‌ها و اقساط", desc: "ثبت کامل و محاسبه خودکار اقساط ماهانه هر بانک" },
  { icon: "chart", title: "گزارش و نمودار", desc: "چه مبلغی، کجا و کِی باید واریز شود" },
  { icon: "download", title: "پشتیبان رمزنگاری‌شده", desc: "خروجی و بازیابی کامل، بدون هیچ سروری" },
  { icon: "sparkles", title: "کاملاً آفلاین و PWA", desc: "قابل نصب روی اندروید و ویندوز، بدون نیاز به اینترنت" },
];

export default function Auth() {
  const { status, meta, unlock, createVault, busy, notify } = useApp();
  const isSetup = status === "setup";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [hint, setHint] = useState("");
  const [owner, setOwner] = useState("");
  const [demo, setDemo] = useState(true);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [waitSec, setWaitSec] = useState(0);
  const [recover, setRecover] = useState(false);
  const [recFile, setRecFile] = useState<File | null>(null);
  const [recPw, setRecPw] = useState("");
  const [newPw, setNewPw] = useState("");

  useEffect(() => {
    if (waitSec <= 0) return;
    const t = window.setTimeout(() => setWaitSec((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [waitSec]);

  const strength = useMemo(() => scorePassword(pw), [pw]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (isSetup) {
      if (pw.length < 6) return setErr("رمز عبور باید حداقل ۶ کاراکتر باشد");
      if (pw !== pw2) return setErr("تکرار رمز عبور مطابقت ندارد");
      await createVault(pw, { hint, ownerName: owner, demo });
      notify("گاوصندوق ساخته شد؛ خوش آمدید 👋", "ok");
      return;
    }
    const res = await unlock(pw);
    if (!res.ok) {
      setWaitSec(res.waitSec || 0);
      setErr(
        res.waitSec
          ? `رمز عبور اشتباه است. ${
              res.waitSec > 3 ? `${toFaDigits(String(res.waitSec))} ثانیه صبر کنید.` : ""
            }`
          : "رمز عبور اشتباه است"
      );
      setPw("");
    }
  }

  async function doRecover() {
    if (!recFile) return setErr("فایل پشتیبان را انتخاب کنید");
    if (newPw.length < 6) return setErr("رمز عبور جدید حداقل ۶ کاراکتر باشد");
    setErr("");
    try {
      const parsed = JSON.parse(await recFile.text()) as BackupFile;
      if (!parsed?.cipher?.iv || !parsed?.salt) throw new Error("bad");
      const key = await deriveKey(recPw, fromB64(parsed.salt), parsed.iterations || DEFAULT_ITERATIONS);
      const data = await decryptJson<{ banks?: unknown[] }>(key, parsed.cipher);
      if (!data?.banks) throw new Error("bad");
      const salt = newSalt();
      const newKey = await deriveKey(newPw, fromB64(salt), DEFAULT_ITERATIONS);
      const m = {
        v: 1 as const,
        salt,
        iterations: DEFAULT_ITERATIONS,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        hint,
        failed: 0,
        lockUntil: 0,
        algo: ALGO,
      };
      storage.meta = m;
      storage.cipher = await encryptJson(newKey, data);
      setRecover(false);
      notify("بازیابی انجام شد؛ اکنون با رمز جدید وارد شوید", "ok");
      const res = await unlock(newPw);
      if (!res.ok) setErr("بازیابی انجام شد اما ورود ناموفق بود؛ دوباره تلاش کنید");
    } catch {
      setErr("رمز فایل پشتیبان اشتباه است یا فایل معتبر نیست");
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* هاله‌های نور */}
      <div className="pointer-events-none absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-brand/30 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-12%] left-[-8%] h-96 w-96 rounded-full bg-brand2/20 blur-[130px]" />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-2 lg:gap-12 lg:py-12">
        {/* برندینگ */}
        <section className="order-2 lg:order-1">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl brand-grad text-white shadow-lg">
              <Icon name="wallet" size={24} />
            </span>
            <div>
              <h1 className="text-xl font-black sm:text-2xl">
                <span className="brand-text">PersonalFinance</span>
              </h1>
              <p className="text-xs text-muted">مدیریت مالی شخصی، آفلاین و رمزنگاری‌شده</p>
            </div>
          </div>

          <p className="mt-5 max-w-lg text-sm leading-7 text-muted sm:text-[15px]">
            همه اطلاعات شما فقط روی همین دستگاه ذخیره می‌شود؛ بدون سرور، بدون ارسال داده و بدون
            نیاز به اینترنت. با یک رمز عبور، گاوصندوق شخصی‌ات را بساز و بانک‌ها، بدهی‌ها و اقساطت
            را مدیریت کن.
          </p>

          <ul className="stagger mt-6 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="glass rounded-2xl p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
                    <Icon name={f.icon} size={16} />
                  </span>
                  <p className="text-[13px] font-bold">{f.title}</p>
                </div>
                <p className="mt-1.5 pr-[42px] text-[11px] leading-5 text-muted">{f.desc}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* فرم */}
        <section className="order-1 lg:order-2">
          <Card className="anim-pop mx-auto w-full max-w-md">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/15 text-brand">
                <Icon name={isSetup ? "key" : "lock"} size={20} />
              </span>
              <div>
                <h2 className="text-lg font-extrabold">{isSetup ? "ساخت گاوصندوق مالی" : "ورود امن"}</h2>
                <p className="text-[11px] text-muted">
                  {isSetup
                    ? "یک رمز عبور قوی انتخاب کنید؛ قابل بازیابی نیست"
                    : meta?.hint
                      ? `راهنما: ${meta.hint}`
                      : "برای رمزگشایی داده‌ها، رمز عبور را وارد کنید"}
                </p>
              </div>
            </div>

            {recover && !isSetup ? (
              <div className="space-y-3">
                <Field label="فایل پشتیبان (.json)">
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => setRecFile(e.target.files?.[0] || null)}
                    className="inp file:mr-2 file:rounded-lg file:border-0 file:bg-surface2 file:px-2 file:py-1 file:text-xs"
                  />
                </Field>
                <Field label="رمز فایل پشتیبان">
                  <Input type="password" value={recPw} onChange={(e) => setRecPw(e.target.value)} />
                </Field>
                <Field label="رمز عبور جدید برای این دستگاه">
                  <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                </Field>
                {err && <p className="text-xs font-semibold text-bad">{err}</p>}
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={doRecover}>
                    بازیابی و ورود
                  </Button>
                  <Button variant="ghost" onClick={() => setRecover(false)}>
                    انصراف
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                {isSetup && (
                  <Field label="نام شما (اختیاری)">
                    <Input
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      placeholder="مثلاً علی"
                      maxLength={24}
                    />
                  </Field>
                )}

                <Field label="رمز عبور" hint={isSetup ? "ترکیب حروف بزرگ/کوچک، عدد و علامت" : undefined}>
                  <div className="relative">
                    <Input
                      className="pl-11"
                      type={show ? "text" : "password"}
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={isSetup ? "new-password" : "current-password"}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink"
                      aria-label="نمایش رمز"
                    >
                      <Icon name={show ? "eyeoff" : "eye"} size={17} />
                    </button>
                  </div>
                </Field>

                {isSetup && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex h-1.5 flex-1 gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className="h-full flex-1 rounded-full transition-colors"
                            style={{
                              background: i < strength.score ? strength.color : "var(--c-line)",
                            }}
                          />
                        ))}
                      </div>
                      <span className="w-20 text-left text-[11px] font-bold" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>

                    <Field label="تکرار رمز عبور">
                      <Input
                        type={show ? "text" : "password"}
                        value={pw2}
                        onChange={(e) => setPw2(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                    </Field>

                    <Field label="راهنمای رمز (اختیاری)" hint="روی همین دستگاه ذخیره می‌شود؛ رمز را ننویسید!">
                      <Input value={hint} onChange={(e) => setHint(e.target.value)} maxLength={40} placeholder="مثلاً اسم کودکی" />
                    </Field>

                    <Toggle
                      checked={demo}
                      onChange={setDemo}
                      label="بارگذاری داده نمونه"
                      desc="چند بانک و قسط نمونه تا با گزارش‌ها آشنا شوید (بعداً حذف کنید)"
                    />
                  </>
                )}

                {err && (
                  <p className="flex items-center gap-1.5 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-xs font-semibold text-bad">
                    <Icon name="alert" size={15} />
                    {err}
                  </p>
                )}

                <Button type="submit" className="w-full py-3" icon={isSetup ? "shieldcheck" : "logout"} disabled={!!busy || waitSec > 0}>
                  {busy
                    ? busy
                    : isSetup
                      ? "ساخت و ورود به گاوصندوق"
                      : waitSec > 0
                        ? `${toFaDigits(String(waitSec))} ثانیه صبر…`
                        : "بازگشایی قفل"}
                </Button>

                {!isSetup && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecover(true);
                      setErr("");
                    }}
                    className="mx-auto flex items-center gap-1.5 text-[11px] text-muted transition hover:text-brand"
                  >
                    <Icon name="upload" size={14} />
                    رمز را فراموش کرده‌اید؟ بازیابی با فایل پشتیبان
                  </button>
                )}
              </form>
            )}

            <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-line pt-4 text-[10px] text-muted">
              <Icon name="shield" size={13} />
              {ALGO} · ذخیره‌سازی محلی · بدون سرور
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
