'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const { user, token, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (requireAuth && !token && typeof window !== 'undefined') {
      const stored = localStorage.getItem('kanban_token');
      if (!stored) router.push('/auth/login');
    }
  }, [token, requireAuth, router]);

  return { user, token, isAuthenticated: !!token };
}
