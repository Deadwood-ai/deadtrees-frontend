import { useQuery } from "@tanstack/react-query";
import { fetchData, fetchCollaborators } from "../utils/dataFetching";
import { useAuth } from "./useAuthProvider";
import { IDataset } from "../types/dataset";

// Base datasets hook
export function useDatasets() {
  return useQuery({
    queryKey: ["datasets"],
    queryFn: fetchData,
  });
}

// User-specific datasets
export function useUserDatasets() {
  const { session } = useAuth();
  const { data: datasets } = useDatasets();

  return useQuery({
    queryKey: ["userDatasets", session?.user?.id],
    enabled: !!session?.user?.id && !!datasets,
    queryFn: () => datasets?.filter((item) => item.user_id === session?.user?.id) || [],
  });
}

// Authors list
export function useAuthors() {
  const { data: datasets } = useDatasets();

  return useQuery({
    queryKey: ["authors"],
    enabled: !!datasets,
    queryFn: () => {
      const authorsUnique = [...new Set(datasets?.map((item) => item.authors).filter(Boolean))];
      return authorsUnique.map((author) => ({
        label: author,
        value: author,
      }));
    },
  });
}

// Collaborators
export function useCollaborators() {
  return useQuery({
    queryKey: ["collaborators"],
    queryFn: fetchCollaborators,
  });
}
