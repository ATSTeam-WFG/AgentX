import { useQuery } from '@tanstack/react-query';
import { getAgenda } from '@/lib/api/agenda';
import { db } from '@/lib/dexie';

export function useAgenda() {
  return useQuery({
    queryKey: ['agenda'],
    queryFn: async () => {
      try {
        const res = await getAgenda();
        await db.agenda.bulkPut(res.events);
        return res.events;
      } catch {
        return db.agenda.toArray();
      }
    },
    staleTime: 60_000,
  });
}
