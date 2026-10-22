import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type QueryValue = {
  params: URLSearchParams;
  replace: (mutate: (params: URLSearchParams) => void) => void;
};

const QueryContext = createContext<QueryValue | null>(null);

export function QueryProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useState(() => new URLSearchParams(window.location.search));

  const replace = useCallback((mutate: (params: URLSearchParams) => void) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      mutate(next);
      const serialized = next.toString();
      if (serialized === prev.toString()) return prev;
      const url = serialized ? `${window.location.pathname}?${serialized}` : window.location.pathname;
      window.history.replaceState(null, '', url);
      return next;
    });
  }, []);

  useEffect(() => {
    const onPop = () => setParams(new URLSearchParams(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const value = useMemo(() => ({ params, replace }), [params, replace]);
  return <QueryContext.Provider value={value}>{children}</QueryContext.Provider>;
}

export function useQuery() {
  const value = useContext(QueryContext);
  if (!value) throw new Error('query');
  return value;
}

export function clearFilterParams(params: URLSearchParams) {
  params.delete('cat');
  params.delete('tag');
  params.delete('provider');
  params.delete('q');
  params.delete('sort');
}
