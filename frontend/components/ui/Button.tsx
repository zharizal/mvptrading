import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "border-terminal-green bg-terminal-green text-black hover:brightness-110 active:brightness-95 disabled:opacity-50",
  secondary:
    "border-terminal-border bg-terminal-panel text-terminal-text hover:border-terminal-cyan/50 disabled:opacity-50",
  ghost:
    "border-transparent bg-transparent text-terminal-muted hover:text-terminal-text hover:bg-white/5 disabled:opacity-50",
  danger:
    "border-red-500/30 bg-red-500/10 text-terminal-red hover:bg-red-500/20 disabled:opacity-50",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-terminal-cyan/40 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
