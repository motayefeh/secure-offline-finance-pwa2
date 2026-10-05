import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../utils/cn";
import { Icon, type IconName } from "./Icons";
import { useApp } from "../store";
import { money } from "../lib/format";

/* ---------------- Button ---------------- */
type Variant = "primary" | "soft" | "ghost" | "danger" | "outline";

export function Button({
  variant = "primary",
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName }) {
  const styles: Record<Variant, string> = {
    primary:
      "text-white brand-grad shadow-[0_10px_30px_-10px_var(--c-brand)] hover:brightness-110 active:brightness-95",
    soft: "bg-surface2 text-ink border border-line hover:bg-line/60",
    ghost: "text-muted hover:text-ink hover:bg-surface2",
    danger: "bg-bad/12 text-bad border border-bad/35 hover:bg-bad/20",
    outline: "border border-line text-ink hover:bg-surface2",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className,
  size = 18,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; size?: number }) {
  return (
    <button
      title={label}
      aria-label={label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface2/60 text-muted transition hover:text-ink hover:bg-line/60 active:scale-95",
        className
      )}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({
  className,
  children,
  padded = true,
}: {
  className?: string;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div className={cn("glass rounded-xl2 shadow-[0_20px_50px_-30px_rgba(0,0,0,.7)]", padded && "p-4 sm:p-5", className)}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  sub,
  icon,
  action,
}: {
  title: string;
  sub?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
            <Icon name={icon} size={18} />
          </span>
        )}
        <div>
          <h2 className="text-base font-extrabold sm:text-lg">{title}</h2>
          {sub && <p className="mt-0.5 text-xs text-muted sm:text-[13px]">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------------- Inputs ---------------- */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted/80">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("inp", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("inp appearance-none", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("inp resize-none", className)} rows={3} {...rest} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface2/40 p-3 text-right transition hover:bg-surface2/70"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {desc && <span className="mt-0.5 block text-[11px] text-muted">{desc}</span>}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "brand-grad" : "bg-line"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200",
            checked ? "right-0.5" : "right-[22px]"
          )}
        />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string; icon?: IconName }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface2/50 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
            value === o.value ? "brand-grad text-white shadow" : "text-muted hover:text-ink"
          )}
        >
          {o.icon && <Icon name={o.icon} size={15} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Bits ---------------- */
export function Badge({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "ok" | "warn" | "bad" | "brand";
  className?: string;
}) {
  const tones = {
    muted: "bg-surface2 text-muted border-line",
    ok: "bg-ok/12 text-ok border-ok/30",
    warn: "bg-warn/12 text-warn border-warn/30",
    bad: "bg-bad/12 text-bad border-bad/30",
    brand: "bg-brand/14 text-brand border-brand/30",
  };
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold", tones[tone], className)}
    >
      {children}
    </span>
  );
}

export function Progress({ value, tone }: { value: number; tone?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line/70">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: tone || "linear-gradient(90deg,var(--c-brand),var(--c-brand2))" }}
      />
    </div>
  );
}

export function EmptyState({
  icon = "info",
  title,
  desc,
  action,
}: {
  icon?: IconName;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-line px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/12 text-brand anim-float">
        <Icon name={icon} size={26} />
      </span>
      <div>
        <p className="font-bold">{title}</p>
        {desc && <p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Amount (با ماسک حریم خصوصی) ---------------- */
export function Amount({
  value,
  className,
  size = "md",
  human = false,
}: {
  value: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  human?: boolean;
}) {
  const { settings } = useApp();
  const hidden = !!settings?.hideAmounts;
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-xl sm:text-2xl", xl: "text-2xl sm:text-4xl" };
  const txt = human
    ? `${humanShort(value)} ${settings?.currency ?? "تومان"}`
    : money(value, settings ?? undefined);
  return (
    <span className={cn("num font-extrabold", sizes[size], hidden && "blur-amount", className)}>{txt}</span>
  );
}

function humanShort(v: number) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)} میلیارد`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)} میلیون`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)} هزار`;
  return String(v);
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: IconName;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />
      <div
        ref={ref}
        className={cn(
          "anim-pop relative w-full rounded-t-xl2 border border-line bg-app2/95 p-4 shadow-2xl backdrop-blur-xl sm:rounded-xl2 sm:p-5",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand">
                <Icon name={icon} size={18} />
              </span>
            )}
            <h3 className="font-extrabold">{title}</h3>
          </div>
          <IconButton icon="x" label="بستن" onClick={onClose} />
        </div>
        <div className="max-h-[70vh] overflow-y-auto pl-1">{children}</div>
        {footer && <div className="mt-5 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Confirm hook ---------------- */
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    desc?: string;
    danger?: boolean;
    onYes?: () => void;
  }>({ open: false, title: "" });

  const ask = (title: string, desc?: string, onYes?: () => void, danger = true) =>
    setState({ open: true, title, desc, onYes, danger });
  const close = () => setState((s) => ({ ...s, open: false }));

  const node = (
    <Modal
      open={state.open}
      onClose={close}
      title={state.title}
      icon={state.danger ? "alert" : "info"}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            انصراف
          </Button>
          <Button
            variant={state.danger ? "danger" : "primary"}
            onClick={() => {
              state.onYes?.();
              close();
            }}
          >
            تأیید
          </Button>
        </>
      }
    >
      <p className="text-sm leading-7 text-muted">{state.desc || "آیا مطمئن هستید؟"}</p>
    </Modal>
  );

  return { ask, node };
}

/* ---------------- Toaster ---------------- */
export function Toaster() {
  const { toasts, dismiss } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[60] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2 lg:bottom-6">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "anim-pop pointer-events-auto flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-right text-xs font-bold shadow-xl backdrop-blur-xl",
            t.kind === "ok" && "border-ok/35 bg-ok/15 text-ok",
            t.kind === "err" && "border-bad/35 bg-bad/15 text-bad",
            t.kind === "info" && "border-line bg-app2/90 text-ink"
          )}
        >
          <Icon name={t.kind === "ok" ? "check" : t.kind === "err" ? "alert" : "info"} size={16} />
          <span className="min-w-0 flex-1">{t.msg}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Reveal (نمایش/مخفی داده حساس) ---------------- */
export function Reveal({ text, className }: { text: string; className?: string }) {
  const [show, setShow] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setShow((s) => !s)}
      className={cn("num inline-flex items-center gap-1.5 text-right", className)}
      title={show ? "مخفی کردن" : "نمایش"}
    >
      {show ? text : "•••• •••• •••• ••••"}
      <Icon name={show ? "eyeoff" : "eye"} size={14} className="shrink-0 text-muted" />
    </button>
  );
}
