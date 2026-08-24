"use client";

import { forwardRef } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ shell */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-white",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-ink">{title}</h2>}
            {description && (
              <p className="text-xs text-ink-muted">{description}</p>
            )}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ----------------------------------------------------------------- button */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const BUTTON_VARIANT: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-ink-muted",
  secondary: "border border-line bg-white text-ink hover:border-brand-300 hover:text-brand-600",
  ghost: "text-ink-soft hover:bg-cream hover:text-ink",
  danger: "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
          size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
          BUTTON_VARIANT[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

/* ------------------------------------------------------------------ badge */

const TONE: Record<string, string> = {
  neutral: "bg-cream text-ink-soft ring-line",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  mint: "bg-mint-50 text-mint-700 ring-mint-200",
  sun: "bg-sun-100 text-amber-700 ring-sun-200",
  sky: "bg-sky-ks/10 text-sky-700 ring-sky-ks/20",
  grape: "bg-grape-100 text-grape-600 ring-grape-300/50",
  red: "bg-red-50 text-red-600 ring-red-200",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof TONE;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
        TONE[tone] ?? TONE.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ forms */

export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold text-ink">
          {label}
          {required && <span className="text-brand-500"> *</span>}
        </span>
        {hint && <span className="text-[11px] text-ink-muted">{hint}</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-[11px] font-semibold text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

const CONTROL =
  "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand-300 focus:ring-4 focus:ring-brand-50 disabled:bg-cream";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(CONTROL, className)} {...props} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(CONTROL, "min-h-24 resize-y leading-relaxed", className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <span className="relative block">
      <select
        ref={ref}
        className={cn(CONTROL, "appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
    </span>
  );
});

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-xs font-bold text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-mint-500" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ misc */

export function EmptyState({
  icon: Icon,
  title,
  copy,
  action,
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-cream text-ink-muted">
        <Icon className="size-7" />
      </span>
      <p className="font-display text-base font-bold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-ink-muted">{copy}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Wraps a wide table so it scrolls itself instead of the page body. */
/**
 * Horizontal scroll container for a wide table.
 *
 * No negative margin: every Card that holds a table sets `bodyClassName="p-0"`,
 * so pulling the table outside the body only pushed it under the card's
 * rounded, overflow-hidden edge and clipped the first and last columns.
 */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">{children}</div>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-ink-muted",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-4 py-3 align-middle text-sm text-ink", className)}>
      {children}
    </td>
  );
}
