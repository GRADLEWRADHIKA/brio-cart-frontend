import { cn } from '@/utils';

/**
 * Brio Cart mark: the cart-with-motion-lines from the original logo, redrawn as a single
 * botanical line drawing with a sprouting leaf.
 */
export function BrioMark({ className, tone = 'forest' }: { className?: string; tone?: 'forest' | 'ivory' }) {
  const fg = tone === 'forest' ? '#113a25' : '#fdfbf6';
  const leaf = tone === 'forest' ? '#3d9a62' : '#c8e86b';
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <path d="M3 17h7M1.5 22.5h7M4 28h6" stroke={leaf} strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M11 9h4.2c.9 0 1.7.6 1.9 1.5L22 31.5c.2.9 1 1.5 1.9 1.5h13.4c.9 0 1.6-.6 1.9-1.4l3.6-12.2c.4-1.3-.6-2.6-1.9-2.6H18"
        stroke={fg}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.5" cy="40" r="3" fill={fg} />
      <circle cx="36.5" cy="40" r="3" fill={fg} />
      <path d="M30.5 23.5c-.3-5 2.7-9.6 9.8-10.7.6 6.4-3.2 10.4-9.8 10.7Z" fill={leaf} />
      <path d="M30.6 23.4c1.6-3.3 3.6-5.4 6-6.8" stroke={tone === 'forest' ? '#fdfbf6' : '#113a25'} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, tone = 'forest', compact }: { className?: string; tone?: 'forest' | 'ivory'; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrioMark className="size-9 shrink-0" tone={tone} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display text-[1.45rem] font-semibold tracking-[-0.03em] display-soft',
              tone === 'forest' ? 'text-forest-800' : 'text-ivory-50',
            )}
          >
            Brio<span className={tone === 'forest' ? 'text-leaf-500' : 'text-lime-300'}>Cart</span>
          </span>
          <span className={cn('mt-0.5 text-[0.56rem] font-extrabold uppercase tracking-[0.22em]', tone === 'forest' ? 'text-charcoal-500' : 'text-ivory-50/60')}>
            Fresh · Safe · Responsible
          </span>
        </span>
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
