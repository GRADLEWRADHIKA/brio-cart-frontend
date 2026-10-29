import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { hasPermission, type Role } from '@shared/core';
import type { AppNotification } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationActions, useNotificationList, useUnreadCount } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { cn, formatDate } from '@/utils';

/** Where a notification leads for each role. */
export function notificationHref(n: AppNotification, role: Role | undefined): string | null {
  if (n.link) return n.link;
  if (role === 'ADMIN' || role === 'SUPERADMIN') {
    if (n.type === 'LOW_STOCK') return '/admin/stock';
    if (n.type === 'CAMPAIGN_ENDING') return hasPermission(role, 'settings:manage') ? '/admin/settings' : '/admin';
    if (n.type === 'DAILY_SUMMARY') return '/admin/daily';
    return n.orderId ? `/admin/orders/${n.orderId}` : null;
  }
  if (role === 'RIDER') return '/rider';
  if (role === 'SHOP_OWNER') {
    if (n.type === 'LOW_STOCK') return '/seller/stock';
    if (n.type === 'DAILY_SUMMARY') return '/seller/daily';
    if (n.type === 'SHOP_PAYOUT') return '/seller/earnings';
    return n.orderId ? `/seller/orders/${n.orderId}` : '/seller';
  }
  return n.orderNumber ? `/orders/${n.orderNumber}` : null;
}

export function notificationsPathFor(role: Role | undefined) {
  if (role === 'ADMIN' || role === 'SUPERADMIN') return '/admin/notifications';
  if (role === 'SHOP_OWNER') return '/seller/notifications';
  if (role === 'RIDER') return '/rider/notifications';
  return '/notifications';
}

function Item({ n, onOpen }: { n: AppNotification; onOpen: (n: AppNotification) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(n)} className={cn('flex w-full gap-3 px-4 py-3 text-left transition hover:bg-ivory-100', !n.readAt && 'bg-mint-50')}>
        <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-leaf-500')} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-forest-900">{n.title}</span>
          <span className="block text-sm text-charcoal-700">{n.body}</span>
          <span className="mt-0.5 block text-xs text-charcoal-400">{formatDate(n.createdAt)}</span>
        </span>
        {!n.readAt && <span className="sr-only">Unread</span>}
      </button>
    </li>
  );
}

function useOpen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { markRead } = useNotificationActions();
  return (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    const href = notificationHref(n, user?.role);
    if (href) navigate(href);
  };
}

/**
 * Bell with unread badge and a dropdown of the latest notifications. Polls every 30 seconds.
 * `align`: which edge of the bell the dropdown lines up with. Use "left" for a bell near the left of
 * the screen (the dashboard sidebars) so the dropdown opens towards the page instead of off-screen.
 */
export function NotificationBell({ tone = 'light', align = 'right', className }: { tone?: 'light' | 'dark'; align?: 'left' | 'right'; className?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = useUnreadCount();
  const list = useNotificationList(1, 8, open);
  const { markAllRead } = useNotificationActions();
  const openItem = useOpen();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const count = unread.data ?? 0;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn('relative grid size-11 place-items-center rounded-full transition', tone === 'dark' ? 'text-ivory-50 hover:bg-white/10' : 'text-forest-800 hover:bg-ivory-200')}
        aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute right-1 top-1 grid min-w-[1.15rem] place-items-center rounded-full bg-tomato-500 px-1 text-[0.62rem] font-extrabold text-white" data-testid="unread-badge">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={cn(
            'fixed inset-x-3 top-16 z-[90] overflow-hidden rounded-3xl border border-line bg-white text-charcoal-900 shadow-2xl sm:absolute sm:inset-x-auto sm:top-12 sm:w-96',
            align === 'left' ? 'sm:left-0' : 'sm:right-0',
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-extrabold text-forest-900">Notifications</p>
            <button type="button" disabled={!count || markAllRead.isPending} onClick={() => markAllRead.mutate()} className="inline-flex items-center gap-1 text-xs font-bold text-forest-700 disabled:opacity-40">
              <CheckCheck className="size-4" /> Mark all read
            </button>
          </div>
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {list.isLoading && <li className="p-4"><div className="skeleton h-12 rounded-xl" /></li>}
            {list.data?.items.map((n) => (
              <Item
                key={n.id}
                n={n}
                onOpen={(x) => {
                  setOpen(false);
                  openItem(x);
                }}
              />
            ))}
            {list.data?.items.length === 0 && <li className="p-6 text-center text-sm text-charcoal-500">You’re all caught up.</li>}
          </ul>
          <Link to={notificationsPathFor(user.role)} onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-sm font-bold text-forest-700 hover:bg-ivory-100">
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

/** Full, paginated notification list (same for every role). */
export function NotificationList() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotificationList(page, 20);
  const { markAllRead } = useNotificationActions();
  const openItem = useOpen();
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <p className="text-sm text-charcoal-500">{data ? `${data.unread} unread · ${data.total} total` : ' '}</p>
        <Button size="sm" variant="outline" icon={<CheckCheck className="size-4" />} disabled={!data?.unread} loading={markAllRead.isPending} onClick={() => markAllRead.mutate()}>
          Mark all read
        </Button>
      </div>
      {isLoading && <div className="skeleton m-4 h-24 rounded-2xl" />}
      {data?.items.length === 0 && (
        <EmptyState icon={<Bell className="size-10" strokeWidth={1.5} />} title="No notifications yet">
          Order updates will appear here.
        </EmptyState>
      )}
      <ul className="divide-y divide-line">{data?.items.map((n) => <Item key={n.id} n={n} onOpen={openItem} />)}</ul>
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
          <Button size="sm" variant="ghost" icon={<ChevronLeft className="size-4" />} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Newer
          </Button>
          <span className="text-charcoal-500">
            Page {data.page} of {data.totalPages}
          </span>
          <Button size="sm" variant="ghost" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Older <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </section>
  );
}
