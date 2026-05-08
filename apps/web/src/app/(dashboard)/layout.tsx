'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { AppShell } from '@/components/layout/AppShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('kanban_token');
      if (!token) router.push('/auth/login');
    }
  }, []);

  return <AppShell>{children}</AppShell>;
}