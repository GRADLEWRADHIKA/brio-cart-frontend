import { cn } from '@/utils';
import logoColor from '@/assets/brand/brio-logo.png';
import logoIvory from '@/assets/brand/brio-logo-ivory.png';
import markColor from '@/assets/brand/brio-mark.png';
import markIvory from '@/assets/brand/brio-mark-ivory.png';

/**
 * Brio Cart brand, from the official logo (bag with a "B" and speed lines).
 * `tone="forest"` is the full-colour version for light backgrounds; `tone="ivory"` is the
 * light version for dark backgrounds (footer, admin sidebar, rider app).
 */
export function BrioMark({ className, tone = 'forest' }: { className?: string; tone?: 'forest' | 'ivory' }) {
  return <img src={tone === 'forest' ? markColor : markIvory} alt="" aria-hidden className={cn('object-contain', className)} />;
}

export function Logo({ className, tone = 'forest', compact }: { className?: string; tone?: 'forest' | 'ivory'; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      {compact ? (
        <BrioMark className="h-9 w-auto shrink-0" tone={tone} />
      ) : (
        <img src={tone === 'forest' ? logoColor : logoIvory} alt="Brio Cart" className="h-9 w-auto shrink-0 sm:h-10" />
      )}
    </span>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Zm-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 7 2.9 9.82 9.82 0 0 1 2.9 6.99c0 5.45-4.44 9.88-9.9 9.88Zm8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41Z" />
    </svg>
  );
}
