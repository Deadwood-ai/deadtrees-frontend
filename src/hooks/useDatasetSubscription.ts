import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./useSupabase";
import { useAuth } from "./useAuthProvider";
import { useProcessingNotification } from "./useProcessingNotification";

interface DatasetStatusData {
  id: number;
  user_id: string;
  file_name: string;
  is_upload_done: boolean;
  is_ortho_done: boolean;
  is_cog_done: boolean;
  is_thumbnail_done: boolean;
  is_metadata_done: boolean;
  is_deadwood_done: boolean;
  has_error: boolean;
  error_message?: string;
}

export function useDatasetSubscription() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { showProcessingCompleteNotification, showProcessingErrorNotification } = useProcessingNotification();

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

          const newData = payload.new as DatasetStatusData;
          const oldData = payload.old as DatasetStatusData;

          // Check if processing just completed (was incomplete before, now complete)
          const wasProcessingComplete =
            oldData &&
            oldData.is_upload_done &&
            oldData.is_ortho_done &&
            oldData.is_cog_done &&
            oldData.is_thumbnail_done &&
            oldData.is_metadata_done &&
            oldData.is_deadwood_done;

          const isNowProcessingComplete =
            newData &&
            newData.is_upload_done &&
            newData.is_ortho_done &&
            newData.is_cog_done &&
            newData.is_thumbnail_done &&
            newData.is_metadata_done &&
            newData.is_deadwood_done;

          // Check if processing just failed
          const hadError = oldData && oldData.has_error;
          const hasErrorNow = newData && newData.has_error;

          // Always update user datasets for progress tracking
          await queryClient.invalidateQueries({
            queryKey: ["userDatasets", session?.user?.id],
          });

          // Show completion notification if processing just completed
          if (!wasProcessingComplete && isNowProcessingComplete && session?.user?.id === newData.user_id) {
            showProcessingCompleteNotification(newData.file_name || "Dataset", newData.id);
          }

          // Show error notification if processing just failed
          if (!hadError && hasErrorNow && session?.user?.id === newData.user_id) {
            showProcessingErrorNotification(newData.file_name || "Dataset", newData.error_message);
          }

          // Only update global datasets and authors when processing is complete
          if (isNowProcessingComplete) {
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
  }, [queryClient, session, showProcessingCompleteNotification, showProcessingErrorNotification]);
}
