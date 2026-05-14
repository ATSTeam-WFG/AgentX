import { useQuery } from '@tanstack/react-query';
import { getActivities } from '@/lib/api/activities';
import { db } from '@/lib/dexie';

export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      try {
        const data = await getActivities();
        await db.activities.bulkPut(data);
        return data;
      } catch {
        return db.activities.toArray();
      }
    },
    staleTime: 300_000,
  });
}
