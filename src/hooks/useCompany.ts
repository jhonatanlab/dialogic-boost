import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCompany() {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*, companies(*)")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const companyId = profile?.company_id ?? null;
  const company = profile?.companies ?? null;

  return { profile, company, companyId, isLoading: profileLoading };
}
