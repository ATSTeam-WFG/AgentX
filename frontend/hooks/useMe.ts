import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/lib/api/profile';
import { db } from '@/lib/dexie';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const profile = await getMe();
        await db.profile.put({ ...profile });
        return profile;
      } catch {
        const cached = await db.profile.toArray();
        if (cached.length) return cached[0] as Awaited<ReturnType<typeof getMe>>;
        throw new Error('Profile unavailable offline');
      }
    },
    staleTime: 60_000,
  });
}
