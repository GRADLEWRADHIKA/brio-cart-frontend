import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Orders placed on this device without signing in, so guests can find and track them again. */
export interface GuestOrderRef {
  orderNumber: string;
  accessKey: string;
  total: number;
  createdAt: string;
}

interface GuestOrdersState {
  orders: GuestOrderRef[];
  remember: (o: GuestOrderRef) => void;
  keyFor: (orderNumber: string) => string | undefined;
}

export const useGuestOrders = create<GuestOrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      remember: (o) =>
        set((s) => ({ orders: [o, ...s.orders.filter((x) => x.orderNumber !== o.orderNumber)].slice(0, 20) })),
      keyFor: (n) => get().orders.find((o) => o.orderNumber === n)?.accessKey,
    }),
    { name: 'briocart.guest-orders.v1', storage: createJSONStorage(() => localStorage) },
  ),
);
