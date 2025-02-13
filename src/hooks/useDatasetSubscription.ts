import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./useSupabase";
import { useAuth } from "./useAuthProvider";
import { Settings } from "../config";

export function useDatasetSubscription() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("datasets_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "v2_statuses",
        },
        (payload) => {
          console.log("payload", payload);
          // if (payload.new.user_id === session?.user.id) {
          console.log("payload.new.user_id", payload.new.user_id); //TODO: filter by dataset_id which belongs to a user
          // Invalidate both datasets and user datasets queries
          queryClient.invalidateQueries({ queryKey: ["datasets"] });
          queryClient.invalidateQueries({ queryKey: ["userDatasets"] });
          // }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, session]);
}
