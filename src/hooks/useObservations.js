import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchAll } from '@/lib/fetchAll';

/**
 * Hook global pour récupérer toutes les Observations (Quantitatives, Qualitatives, Externes).
 * Remplace progressivement les anciens hooks spécifiques (Transactions, Achats).
 */
export function useObservations(options = {}) {
  return useQuery({
    queryKey: ['observations', options.limit],
    queryFn: async () => {
      if (options.limit) {
        return (await base44.entities.Observation.list('-date', options.limit)) || [];
      }
      return fetchAll(base44.entities.Observation, '-date');
    },
    staleTime: 300000, // 5 minutes
  });
}
