import { useEffect, useState } from 'react';

export function useSupabaseSession() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    async function initSession() {
      const { supabase } = await import('../lib/supabase');
      const {
        data: { session: nextSession },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(nextSession);
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
        if (isMounted) {
          setSession(updatedSession);
        }
      });

      unsubscribe = () => subscription.unsubscribe();
    }

    initSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return session;
}
