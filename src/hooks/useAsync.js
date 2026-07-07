import { useEffect, useState } from 'react';

// Generic async-fetch hook wrapping any data-access-layer call. Components
// should never call src/data/api.js directly with raw fetch/useEffect
// boilerplate — go through this (or one of the specific hooks in this folder).
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: null, data });
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, error, data: null });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadCount]);

  const reload = () => setReloadCount((c) => c + 1);

  return { ...state, reload };
}
