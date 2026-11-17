import { useEffect, useState } from 'react';

/** True while the media query matches; follows changes (rotation, resizing). */
export function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Phone layout: narrower than Tailwind's `sm` (640px). */
export const usePhone = () => useMedia('(max-width: 639px)');
