'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth, setAccessToken } = useAuthStore();

  useEffect(() => {
    const code = params.get('code');

    if (!code) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/auth/callback');
    }

    let capturedAccessToken = '';
    let capturedRefreshToken = '';

    api
      .post('/auth/exchange-code', { code })
      .then((res) => {
        if (!res.data.success) throw new Error('Code exchange failed');
        capturedAccessToken = res.data.data.accessToken;
        capturedRefreshToken = res.data.data.refreshToken ?? '';
        // Put token in store before /auth/me so the interceptor attaches it
        setAccessToken(capturedAccessToken);
        return api.get('/auth/me');
      })
      .then((res) => {
        const user = res.data.data ?? res.data;
        setAuth(user, capturedAccessToken, capturedRefreshToken);
        router.replace('/dashboard');
      })
      .catch(() => router.replace('/login?error=oauth_failed'));
  }, [params, router, setAuth, setAccessToken]);

  return (
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Signing you in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Suspense
        fallback={
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        }
      >
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
