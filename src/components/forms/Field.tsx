import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils';

const control =
  'w-full rounded-2xl border border-line bg-white px-4 text-[0.95rem] text-charcoal-900 shadow-[inset_0_1px_2px_rgb(23_32_27/0.04)] transition placeholder:text-charcoal-400 focus:border-leaf-500 focus:outline-none focus:ring-4 focus:ring-leaf-500/15 aria-[invalid=true]:border-tomato-500 aria-[invalid=true]:ring-tomato-500/10 disabled:bg-ivory-100';

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  className?: string;
}

export function FieldShell({ label, error, hint, optional, children, className }: FieldShellProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-bold text-charcoal-700">
        {label}
        {optional && <span className="text-xs font-semibold text-charcoal-400">Optional</span>}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-[0.8rem] font-semibold text-tomato-500">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[0.8rem] text-charcoal-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode; optional?: boolean; prefix?: string };

export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField(
  { label, error, hint, optional, prefix, className, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} optional={optional} className={className}>
      {(id, describedBy) => (
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[0.95rem] font-semibold text-charcoal-500">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy}
            className={cn(control, 'h-12', prefix && 'pl-13')}
            {...rest}
          />
        </div>
      )}
    </FieldShell>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: ReactNode; optional?: boolean };

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextareaProps>(function TextAreaField(
  { label, error, hint, optional, className, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} optional={optional} className={className}>
      {(id, describedBy) => (
        <textarea
          ref={ref}
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(control, 'min-h-24 py-3')}
          {...rest}
        />
      )}
    </FieldShell>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; hint?: ReactNode; optional?: boolean };

export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField(
  { label, error, hint, optional, className, children, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} optional={optional} className={className}>
      {(id, describedBy) => (
        <select
          ref={ref}
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn(control, 'h-12 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%2317492f%27 stroke-width=%272%27 stroke-linecap=%27round%27%3E%3Cpath d=%27m4 6 4 4 4-4%27/%3E%3C/svg%3E")] bg-[position:right_1rem_center] bg-no-repeat pr-10')}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
});

export function Checkbox({ label, description, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3', className)}>
      <input id={id} type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md accent-forest-700" {...rest} />
      <span className="text-sm">
        <span className="font-semibold text-charcoal-900">{label}</span>
        {description && <span className="mt-0.5 block text-charcoal-500">{description}</span>}
      </span>
    </label>
  );
}
