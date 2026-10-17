import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { tokenStore } from '@/services/token-store';
import type { User } from '@/types';

export function useAuth() {
  const qc = useQueryClient();
  const me = useQuery<User | null>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const onSession = async ({ user, token }: { user: User; token: string }) => {
    await tokenStore.set(token);
    qc.setQueryData(['me'], user);
    await qc.invalidateQueries({ queryKey: ['account'] });
  };

  const login = useMutation({
    mutationFn: (v: { identifier: string; password: string }) => authApi.login(v.identifier, v.password),
    onSuccess: onSession,
  });
  const register = useMutation({ mutationFn: authApi.register, onSuccess: onSession });
  const logout = useMutation({
    mutationFn: async () => {
      await authApi.logout().catch(() => undefined);
      await tokenStore.set(null);
    },
    onSuccess: () => {
      qc.setQueryData(['me'], null);
      qc.removeQueries({ queryKey: ['account'] });
    },
  });

  return { user: me.data ?? null, loading: me.isLoading, login, register, logout };
}
