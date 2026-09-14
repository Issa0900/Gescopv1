import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useCompany() {
  const { data: company, isLoading, refetch } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const list = await base44.entities.Company.list();
      return list && list[0] ? list[0] : null;
    },
  });
  return { company, isLoading, refetch };
}