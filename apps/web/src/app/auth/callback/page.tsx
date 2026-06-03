'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get('code');
    if (!code) {
      toast.error('Authentication failed — no code received.');
      router.replace('/login');
      return;
    }

    api.post('/auth/exchange-code', { code })
      .then((res) => {
        const { accessToken, refreshToken } = res.data.data;
        // Fetch user profile with the new token
        return api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then((meRes) => {
          setAuth(meRes.data.data ?? meRes.data, accessToken, refreshToken);
          toast.success('Signed in with Google!', { icon: '🎉' });
          router.replace('/dashboard');
        });
      })
      .catch(() => {
        toast.error('Google sign-in failed. Please try again.');
        router.replace('/login');
      });
  }, [searchParams, router, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="w-12 h-12 border-2 border-border/30 rounded-full" />
          <div className="absolute inset-0 w-12 h-12 border-2 border-t-neon-purple border-r-neon-cyan border-b-transparent border-l-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Completing sign-in...</p>
      </div>
    </div>
  );
}
