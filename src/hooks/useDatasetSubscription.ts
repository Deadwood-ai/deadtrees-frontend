import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./useSupabase";
import { useAuth } from "./useAuthProvider";

export function useDatasetSubscription() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("status_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "v2_statuses",
        },
        async (payload) => {
          console.log("Status change payload:", payload);
          // First invalidate and wait for the base dataset query
          await queryClient.invalidateQueries({ queryKey: ["datasets"] });
          // Then invalidate dependent queries
          await queryClient.invalidateQueries({
            queryKey: ["userDatasets", session?.user?.id],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, session]);
}
