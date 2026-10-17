import { PageHeader } from '@/components/admin/kit';
import { NotificationList } from '@/components/notifications/Notifications';

export default function AdminNotifications() {
  return (
    <>
      <PageHeader title="Notifications" subtitle="New orders, rider rejections and failed deliveries. Refreshes every 30 seconds." />
      <NotificationList />
    </>
  );
}
