import { useRef, useState } from 'react';
import { Check, ImageUp, X } from 'lucide-react';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { ProductImage } from '@/components/ui/misc';
import { cn } from '@/utils';

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

/** Multi-select toggle chips. */
export function ChipGroup<T extends string>({
  options,
  labels,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: T[];
  onChange: (v: T[]) => void;
  /** Group name for screen readers. */
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition',
              on ? 'border-forest-800 bg-forest-800 text-ivory-50' : 'border-line bg-white text-charcoal-700 hover:border-forest-800/40',
            )}
          >
            {on && <Check className="size-3.5" aria-hidden />}
            {labels[o]}
          </button>
        );
      })}
    </div>
  );
}

/** An image setting: upload with the admin uploader, or paste an https link. Empty = null. */
export function ImageInput({
  label,
  value,
  onChange,
  upload,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  upload: (file: File) => Promise<{ url: string }>;
  hint?: string;
  error?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const pick = async (file: File) => {
    setBusy(true);
    setUploadError(null);
    try {
      onChange((await upload(file)).url);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex gap-3">
      <ProductImage src={value || null} alt="" className="size-24 shrink-0 rounded-2xl bg-ivory-100" sizes="96px" />
      <div className="min-w-0 flex-1 space-y-2">
        <TextField label={label} optional placeholder="https://… or upload" value={value} onChange={(e) => onChange(e.target.value)} hint={hint} error={error ?? uploadError ?? undefined} />
        <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(ev) => { const f = ev.target.files?.[0]; ev.target.value = ''; if (f) void pick(f); }} />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={<ImageUp className="size-4" />} loading={busy} onClick={() => fileRef.current?.click()}>Upload</Button>
          {value && <Button size="sm" variant="ghost" icon={<X className="size-4" />} onClick={() => onChange('')}>Remove</Button>}
        </div>
      </div>
    </div>
  );
}
