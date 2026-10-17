/** Each category gets a natural produce tint that the product photos blend into. */
const TINTS: Record<string, { plate: string; ring: string; text: string }> = {
  'fresh-vegetables': { plate: 'bg-mint-100', ring: 'ring-mint-200', text: 'text-forest-700' },
  'fresh-fruits': { plate: 'bg-peach-100', ring: 'ring-[#f8cfb4]', text: 'text-[#9a3f12]' },
  'dairy-milk': { plate: 'bg-sky-100', ring: 'ring-[#c7dcef]', text: 'text-[#1e4f78]' },
  'exotic-vegetables': { plate: 'bg-[#eef6d2]', ring: 'ring-lime-200', text: 'text-[#4b6410]' },
};
const FALLBACK = { plate: 'bg-ivory-200', ring: 'ring-ivory-300', text: 'text-forest-700' };

export const tintFor = (categorySlug: string | undefined) => (categorySlug && TINTS[categorySlug]) || FALLBACK;
