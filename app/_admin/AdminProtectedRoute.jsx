'use client';

import { useEffect, useState } from 'react';
import { AppNavigate, useAppLocation } from '../../src/components/RouterAdapter';
import RouteStatusScreen from '../../src/components/RouteStatusScreen';
import { useSupabaseSession } from '../../src/hooks/useSupabaseSession';
import { createExpiringPromiseCache } from '../../src/lib/expiringPromiseCache';

const ADMIN_ACCESS_CACHE_TTL_MS = 60 * 1000;
const adminAccessCache = createExpiringPromiseCache({
  ttlMs: ADMIN_ACCESS_CACHE_TTL_MS,
});

function RouteGateFallback({ message = 'VERIFYING ACCESS...' }) {
  return <RouteStatusScreen message={message} />;
}

export default function AdminProtectedRoute({ children }) {
  const session = useSupabaseSession();
  const location = useAppLocation();
  const [adminStatus, setAdminStatus] = useState('idle');
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function requestAdminVerification(accessToken) {
      const response = await fetch('/api/admin-session', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      return { response, payload };
    }

    async function verifyAdminAccessWithCache(accessToken) {
      return adminAccessCache.get(accessToken, async () => requestAdminVerification(accessToken));
    }

    async function verifyAdminAccess() {
      if (!session?.access_token) {
        setAdminStatus('idle');
        setAdminError('');
        return;
      }

      setAdminStatus('checking');
      setAdminError('');

      let response;
      let payload = {};

      try {
        ({ response, payload } = await verifyAdminAccessWithCache(session.access_token));
      } catch {
        if (!cancelled) {
          setAdminStatus('error');
          setAdminError('Admin access check could not reach the server. If you are developing locally, make sure the API is running too.');
        }
        return;
      }

      if (cancelled) {
        return;
      }

      if (response.ok && payload?.success) {
        setAdminStatus('authorized');
        return;
      }

      if (response.status === 401 || response.status === 403) {
        setAdminStatus('denied');
        return;
      }

      setAdminStatus('error');
      if (response.status === 404) {
        setAdminError('Admin access check is unavailable right now. If you are developing locally, make sure the API routes are running.');
        return;
      }

      setAdminError(payload?.error?.message || payload?.message || 'Unable to verify admin access.');
    }

    verifyAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (session === undefined) {
    return <RouteGateFallback />;
  }

  const next = `${location.pathname}${location.search}${location.hash}`;

  if (!session) {
    return <AppNavigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (adminStatus === 'checking' || adminStatus === 'idle') {
    return <RouteGateFallback />;
  }

  if (adminStatus === 'denied') {
    return <AppNavigate to={`/login?next=${encodeURIComponent(next)}&unauthorized=1`} replace />;
  }

  if (adminStatus === 'error') {
    return <RouteGateFallback message={adminError || 'ADMIN ACCESS IS UNAVAILABLE.'} />;
  }

  return children;
}
