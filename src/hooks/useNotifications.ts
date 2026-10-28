import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/endpoints';
import { useAuth } from '@/hooks/useAuth';

/** In-app notifications are polled; urgent ones also arrive as browser push (usePush). */
export const NOTIFICATION_POLL_MS = 15_000;

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'unread', user?.id],
    queryFn: notificationsApi.unreadCount,
    enabled: !!user,
    refetchInterval: NOTIFICATION_POLL_MS,
    staleTime: 10_000,
  });
}

export function useNotificationList(page = 1, pageSize = 20, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'list', user?.id, page, pageSize],
    queryFn: () => notificationsApi.list(page, pageSize),
    enabled: !!user && enabled,
    refetchInterval: NOTIFICATION_POLL_MS,
    staleTime: 10_000,
  });
}

export function useNotificationActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refresh });
  const markAllRead = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: refresh });
  return { markRead, markAllRead };
}
