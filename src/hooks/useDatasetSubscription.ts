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

          // Only invalidate datasets and authors when processing is complete
          const isProcessingComplete =
            payload.new.is_upload_done &&
            payload.new.is_ortho_done &&
            payload.new.is_cog_done &&
            payload.new.is_thumbnail_done &&
            payload.new.is_metadata_done &&
            payload.new.is_deadwood_done;

          // Always update user datasets for progress tracking
          await queryClient.invalidateQueries({
            queryKey: ["userDatasets", session?.user?.id],
          });

          // Only update global datasets and authors when processing is complete
          if (isProcessingComplete) {
            await queryClient.invalidateQueries({
              queryKey: ["datasets"],
            });
            await queryClient.invalidateQueries({
              queryKey: ["authors"],
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, session]);
}
