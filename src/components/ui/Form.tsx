"use client";

import { forwardRef } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Storefront form primitives.
 *
 * Deliberately separate from the admin set in `components/admin/ui.tsx`: the
 * shopper-facing controls are larger (44px+ touch targets), rounder and
 * higher-contrast, because they are used on phones mid-checkout.
 */

const CONTROL =
  "w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand-400 disabled:bg-cream";

export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-xs font-bold text-ink">
            {label}
            {required && <span className="text-brand-500"> *</span>}
          </span>
          {hint && <span className="text-[11px] text-ink-muted">{hint}</span>}
        </span>
      )}
      {children}
      {error && (
        <span className="mt-1 block text-[11px] font-semibold text-brand-600">
          {error}
        </span>
      )}
    </label>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, invalid && "border-brand-400", className)}
      {...props}
    />
  );
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
        className={cn(CONTROL, "appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
    </span>
  );
});

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const VARIANT: Record<NonNullable<BtnProps["variant"]>, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-ink-muted",
  outline:
    "border-2 border-line bg-white text-ink hover:border-brand-300 hover:text-brand-600",
  ghost: "text-ink-soft hover:bg-cream hover:text-ink",
  danger: "border-2 border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100",
};

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "primary", size = "md", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" && "px-4 py-2 text-xs",
        size === "md" && "px-5 py-3 text-sm",
        size === "lg" && "px-7 py-3.5 text-sm",
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
});

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-2.5 text-left"
    >
      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition",
          checked ? "border-brand-500 bg-brand-500" : "border-line bg-white",
        )}
      >
        {checked && <Check className="size-3 text-white" strokeWidth={3.5} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-muted">{hint}</span>}
      </span>
    </button>
  );
}

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
        <p className="text-sm font-bold text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
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

/** Large tappable radio used for address and payment selection. */
export function RadioCard({
  selected,
  onSelect,
  icon: Icon,
  title,
  subtitle,
  right,
  children,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  icon?: LucideIcon;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 transition",
        selected ? "border-brand-400 bg-brand-50/50" : "border-line bg-white",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={onSelect}
        className="flex w-full items-start gap-3 p-4 text-left disabled:cursor-not-allowed"
      >
        <span
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition",
            selected ? "border-brand-500" : "border-line",
          )}
        >
          {selected && <span className="size-2.5 rounded-full bg-brand-500" />}
        </span>

        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cream text-ink-soft">
            <Icon className="size-4.5" />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">{title}</span>
          {subtitle && (
            <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
              {subtitle}
            </span>
          )}
        </span>

        {right}
      </button>
      {selected && children && (
        <div className="border-t border-line px-4 py-3">{children}</div>
      )}
    </div>
  );
}

export function SectionCard({
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
        "overflow-hidden rounded-card border border-line bg-white",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-base font-extrabold text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-ink-muted">{description}</p>
            )}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
