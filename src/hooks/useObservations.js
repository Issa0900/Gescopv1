import { useQuery } from '@tanstack/react-query';
import { base44 } from 'base44';

/**
 * Hook global pour rǸcupǸrer toutes les Observations (Quantitatives, Qualitatives, Externes).
 * Remplace progressivement les anciens hooks spǸcifiques (Transactions, Achats).
 */
export function useObservations(options = {}) {
  return useQuery({
    queryKey: ['observations', options],
    queryFn: async () => {
      // Par dǸfaut on rǸcupre les 1000 dernires observations
      const results = await base44.entities.Observation.findMany({
        limit: options.limit || 1000,
        orderBy: { date: 'desc' },
        ...options.filters
      });
      return results;
    },
    staleTime: 300000, // 5 minutes
  });
}

