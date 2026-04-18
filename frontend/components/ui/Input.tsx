import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

function FieldWrapper({ label, hint, error, children }: FieldWrapperProps) {
  return (
    <label className="flex flex-col gap-1">
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-terminal-muted">
          {label}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="text-[11px] text-terminal-red">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-terminal-muted">{hint}</span>
      ) : null}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className, ...rest }: InputProps) {
  return (
    <FieldWrapper label={label} hint={hint} error={error}>
      <input
        {...rest}
        className={`rounded-lg border border-terminal-border bg-black/20 px-3 py-2 text-sm text-terminal-text placeholder:text-terminal-muted focus:border-terminal-cyan focus:outline-none focus:ring-1 focus:ring-terminal-cyan/40 disabled:opacity-50 ${
          error ? "border-red-500/40" : ""
        } ${className ?? ""}`}
      />
    </FieldWrapper>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, hint, error, options, className, ...rest }: SelectProps) {
  return (
    <FieldWrapper label={label} hint={hint} error={error}>
      <select
        {...rest}
        className={`rounded-lg border border-terminal-border bg-black/20 px-3 py-2 text-sm text-terminal-text focus:border-terminal-cyan focus:outline-none focus:ring-1 focus:ring-terminal-cyan/40 ${
          error ? "border-red-500/40" : ""
        } ${className ?? ""}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
