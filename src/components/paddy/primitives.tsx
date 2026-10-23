import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** paddy bot avatar (Figma: botAvatar). */
export function BotAvatar({ size = 36, pulsing = false }: { size?: number; pulsing?: boolean }) {
  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border border-decorative-2 bg-container",
        pulsing && "animate-pulse-soft",
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/paddy-orb.png" alt="" width={size * 0.73} height={size * 0.73} />
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  icon?: ReactNode;
};

/** paddy button (Figma: button). Primary = content/secondaryBrand, 40px, radius-sm. */
export function Button({ variant = "primary", size = "md", icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-sm font-medium tracking-[0.12px] whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed",
        size === "md" ? "h-10 px-5 text-xs" : "h-8 px-3 text-xs",
        variant === "primary" && "bg-brand text-on-brand hover:bg-brand-hover disabled:bg-brand/50",
        variant === "secondary" &&
          "border border-decorative-2 bg-container text-primary hover:border-brand/40 hover:bg-brand-light disabled:text-secondary disabled:hover:bg-container",
        variant === "ghost" && "text-secondary hover:bg-brand-light hover:text-primary",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** paddy chip (Figma: chip) — selections and quick actions. */
export function Chip({
  children,
  onClick,
  tone = "default",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "default" | "selected";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "body-xs inline-flex h-8 items-center gap-1.5 rounded-full border px-3 transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50",
        tone === "default" && "border-decorative-2 bg-container text-primary hover:border-brand/50 hover:bg-brand-light",
        tone === "selected" &&
          "border-dashed border-brand/35 bg-brand-light/60 text-primary hover:border-brand hover:bg-brand-light",
      )}
    >
      {children}
    </button>
  );
}
