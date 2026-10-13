import { useMemo } from 'react';

import { buildGroceryList, reservedBefore, splitList } from '@/lib/grocery';
import { useStore } from './useStore';

/** The grocery list for a week, taking into account the pantry and what earlier weeks still need. */
export function useGroceryList(weekId: string) {
  const week = useStore((s) => s.weeks[weekId]);
  const weeks = useStore((s) => s.weeks);
  const pantry = useStore((s) => s.profile.pantry);
  return useMemo(() => {
    const reserved = reservedBefore(weeks, weekId);
    const list = buildGroceryList(week, { pantry, reserved });
    return { list, ...splitList(list) };
  }, [week, weeks, pantry, weekId]);
}
