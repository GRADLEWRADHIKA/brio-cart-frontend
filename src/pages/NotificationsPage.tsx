import { useEffect } from 'react';
import { NotificationList } from '@/components/notifications/Notifications';

export default function NotificationsPage() {
  useEffect(() => {
    document.title = 'Notifications — Brio Cart';
  }, []);
  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <p className="eyebrow text-leaf-600">My account</p>
      <h1 className="mb-6 mt-2 font-display text-4xl font-semibold text-forest-900 sm:text-5xl">Notifications</h1>
      <NotificationList />
    </div>
  );
}
