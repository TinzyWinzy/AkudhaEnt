import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { loadCacheValue, saveCacheValue } from '../lib/offlineDb';

export function useIndexedDbCache<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const hydrated = useRef(false);

  useEffect(() => {
    let active = true;
    void loadCacheValue<T>(key)
      .then(saved => {
        if (active && saved !== undefined) setValue(saved);
      })
      .catch(() => console.warn(`Failed to load ${key} from IndexedDB`))
      .finally(() => { hydrated.current = true; });
    return () => { active = false; };
  }, [key]);

  useEffect(() => {
    if (!hydrated.current) return;
    void saveCacheValue(key, value).catch(() => console.warn(`Failed to persist ${key} to IndexedDB`));
  }, [key, value]);

  return [value, setValue];
}
