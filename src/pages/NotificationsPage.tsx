import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { NotificationCards } from '@/components/notifications/Notifications';

export default function NotificationsPage() {
  useEffect(() => {
    document.title = 'Notifications — Brio Cart';
  }, []);
  return (
    <div className="container-page py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-charcoal-500">
        <Link to="/" className="hover:text-forest-700">Home</Link> <span aria-hidden>›</span> <span className="text-charcoal-900">Notifications</span>
      </nav>
      <h1 className="mb-6 mt-1 font-display text-3xl font-bold text-forest-900 sm:text-4xl">Notifications</h1>
      <NotificationCards />
    </div>
  );
}
