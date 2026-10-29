import { beforeEach, describe, expect, it } from 'vitest';
import { useWishlist } from '@/store/wishlist';
import { reopensLabel } from '@/utils';

const kiwi = { id: 'p1', slug: 'kiwi', name: 'Kiwi', imageUrl: null };
const atta = { id: 'p2', slug: 'atta', name: 'Atta', imageUrl: '/a.jpg' };

describe('saved items', () => {
  beforeEach(() => useWishlist.setState({ items: [] }));

  it('saves, lists newest first, and un-saves on a second tap', () => {
    expect(useWishlist.getState().toggle(kiwi)).toBe(true);
    expect(useWishlist.getState().toggle(atta)).toBe(true);
    expect(useWishlist.getState().items.map((i) => i.slug)).toEqual(['atta', 'kiwi']);
    expect(useWishlist.getState().has('p1')).toBe(true);
    expect(useWishlist.getState().toggle(kiwi)).toBe(false);
    expect(useWishlist.getState().items.map((i) => i.slug)).toEqual(['atta']);
    useWishlist.getState().remove('p2');
    expect(useWishlist.getState().items).toEqual([]);
  });
});

describe('reopensLabel', () => {
  // 29 Oct 2026, 10:00 India time.
  const now = new Date('2026-10-29T04:30:00Z');
  it('says today, tomorrow or the date, in India time', () => {
    expect(reopensLabel('2026-10-29T12:30:00Z', now)).toBe('today at 6:00 pm');
    expect(reopensLabel('2026-10-30T03:30:00Z', now)).toBe('tomorrow at 9:00 am');
    expect(reopensLabel('2026-11-02T03:30:00Z', now)).toMatch(/^on Mon,? 2 Nov at 9:00 am$/);
  });
});
