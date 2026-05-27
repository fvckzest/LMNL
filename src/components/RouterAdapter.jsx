import { createContext, useContext, useEffect } from 'react';

const RouterAdapterContext = createContext(null);

export function RouterAdapterProvider({ value, children }) {
  return (
    <RouterAdapterContext.Provider value={value}>
      {children}
    </RouterAdapterContext.Provider>
  );
}

export function AppLink({ to, children, ...props }) {
  const adapter = useContext(RouterAdapterContext);

  if (adapter?.Link) {
    const LinkComponent = adapter.Link;
    return (
      <LinkComponent to={to} {...props}>
        {children}
      </LinkComponent>
    );
  }

  return (
    <a href={to} {...props}>
      {children}
    </a>
  );
}

export function useAppLocation() {
  const adapter = useContext(RouterAdapterContext);

  if (adapter?.pathname) {
    return {
      hash: adapter.hash || (typeof window !== 'undefined' ? window.location.hash : ''),
      pathname: adapter.pathname,
      search: adapter.search || '',
    };
  }

  if (typeof window !== 'undefined') {
    return {
      hash: window.location.hash,
      pathname: window.location.pathname,
      search: window.location.search,
    };
  }

  return { hash: '', pathname: '/', search: '' };
}

export function useAppNavigate() {
  const adapter = useContext(RouterAdapterContext);

  if (adapter?.navigate) {
    return adapter.navigate;
  }

  return (to, options = {}) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (options?.replace) {
      window.location.replace(to);
      return;
    }

    window.location.assign(to);
  };
}

export function AppNavigate({ to, replace = false }) {
  const navigate = useAppNavigate();

  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, replace, to]);

  return null;
}
