import type { Product } from '@/types';

export const milk: Product = {
  id: 'p-milk',
  slug: 'amul-gold-full-cream-milk',
  name: 'Amul Gold Full Cream Milk',
  nameHi: null,
  description: null,
  highlight: 'Full Cream',
  imageUrl: '/uploads/products/amul-gold-full-cream-milk.webp',
  category: { id: 'c-dairy', slug: 'dairy-milk', name: 'Dairy & Milk' },
  shop: null,
  collections: ['essentials'],
  inStock: true,
  fromPrice: 3600,
  variants: [
    { id: 'v-500', label: '500 ml', price: 3600, mrp: null, inStock: true, maxQty: 10, lowStock: null },
    { id: 'v-1l', label: '1 litre', price: 7200, mrp: null, inStock: true, maxQty: 3, lowStock: null },
  ],
};

export const grapes: Product = {
  ...milk,
  id: 'p-grapes',
  slug: 'grapes',
  name: 'Grapes',
  nameHi: 'अंगूर',
  category: { id: 'c-fruit', slug: 'fresh-fruits', name: 'Fresh Fruits' },
  inStock: false,
  fromPrice: 11100,
  variants: [{ id: 'v-grapes', label: '250 g', price: 11100, mrp: null, inStock: false, maxQty: 0, lowStock: null }],
};

export const combo: Product = {
  ...milk,
  id: 'p-combo',
  slug: 'navratri-combo',
  name: 'Navratri Combo',
  nameHi: 'नवरात्रि कॉम्बो',
  category: { id: 'c-veg', slug: 'fresh-vegetables', name: 'Fresh Vegetables' },
  fromPrice: 24900,
  variants: [{ id: 'v-combo', label: '1 combo (approx. 4 kg)', price: 24900, mrp: 34900, inStock: true, maxQty: 10, lowStock: null }],
};
