import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'lime' | 'whatsapp' | 'danger' | 'ivory';
type Size = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-all duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'bg-forest-800 text-ivory-50 shadow-[0_8px_20px_-8px_rgb(12_42_27/0.55)] hover:bg-forest-700 hover:shadow-[0_12px_28px_-10px_rgb(12_42_27/0.6)]',
  secondary: 'bg-mint-100 text-forest-800 hover:bg-mint-200',
  ghost: 'text-forest-800 hover:bg-forest-900/5',
  outline: 'border border-forest-800/20 bg-white/60 text-forest-800 hover:border-forest-800/50 hover:bg-white',
  lime: 'bg-lime-300 text-forest-900 shadow-[0_10px_30px_-10px_rgb(200_232_107/0.9)] hover:bg-lime-200',
  ivory: 'bg-ivory-50 text-forest-900 hover:bg-white',
  whatsapp: 'bg-[#1fae55] text-white shadow-[0_10px_24px_-10px_rgb(31_174_85/0.8)] hover:bg-[#199a4a]',
  danger: 'bg-tomato-500 text-white hover:bg-tomato-500/90',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[0.95rem]',
  lg: 'h-14 px-7 text-base',
};

interface Common {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
}

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', block = false, extra?: string) =>
  cn(base, variants[variant], sizes[size], block && 'w-full', extra);

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & Common>(function Button(
  { variant = 'primary', size = 'md', loading, icon, iconRight, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, block, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  );
});

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  block,
  className,
  children,
  ...rest
}: LinkProps & Common) {
  return (
    <Link className={buttonClass(variant, size, block, className)} {...rest}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
