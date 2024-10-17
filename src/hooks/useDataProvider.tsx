import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../hooks/useSupabase";
import { IDataset, IThumbnail, ICollaborators } from "../types/dataset";
import { Settings } from "../config";
import { useAuth } from "./useAuthProvider";

interface DataProviderProps {
  children: React.ReactNode;
}

interface AuthorOption {
  label: string;
  value: string;
}

type DataContextType = {
  data: IDataset[] | undefined;
  filter: string;
  setFilter: (filter: string) => void;
  setFilterTag: (filterTag: string) => void;
  thumbnails: IThumbnail[] | undefined;
  collaborators: ICollaborators[] | undefined;
  authors: AuthorOption[] | undefined;
  userData: IDataset[] | undefined;
  isLoading: boolean;
};

const DataContext = createContext<DataContextType>({
  data: undefined,
  filter: "",
  setFilter: () => { },
  setFilterTag: () => { },
  authors: undefined,
  thumbnails: undefined,
  collaborators: undefined,
  userData: undefined,
  isLoading: false,
});

const fetchData = async () => {
  const { data, error } = await supabase.from(Settings.DATA_TABLE_FULL).select("*");
  // console.log("fetchData", data);
  if (error) throw error;
  return data;
};

const fetchCollaborators = async () => {
  const { data, error } = await supabase.from("collaborators").select("*");
  if (error) throw error;
  return data;
};

const DataProvider = ({ children }: DataProviderProps) => {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data: rawData, isLoading: isLoadingRawData } = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchData,
    // staleTime: 0,
  });

  const { data: collaborators, isLoading: isLoadingCollaborators } = useQuery({
    queryKey: ['collaborators'],
    queryFn: fetchCollaborators,
  });

  const { data: userData } = useQuery({
    queryKey: ['userData', session?.user.id, rawData],
    enabled: !!session && !!rawData,
    queryFn: () => rawData?.filter((item) => item.user_id === session?.user.id) || [],
  });

  const { data: authors } = useQuery({
    queryKey: ['authors', rawData],
    enabled: !!rawData,
    queryFn: () => {
      const authorsUnique = [...new Set(rawData?.map((item) => item.authors).filter(Boolean))];
      return authorsUnique.map((author) => ({
        label: author,
        value: author,
      }));
    },
  });

  // ... other state management (filter, filterTag, etc.) remains the same
  const [filter, setFilter] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("");

  const filteredData = useMemo(() => {
    if (!rawData || !filter) return rawData;
    return rawData.filter((item) => {
      switch (filterTag) {
        case "platform":
          return item.platform === filter;
        case "license":
          return item.license === filter;
        case "authors_image":
          return item.authors === filter;
        case "admin_level_1":
          return item.admin_level_1 === filter;
        case "admin_level_3":
          return item.admin_level_3 === filter;
        default:
          return false;
      }
    });
  }, [filter, rawData, filterTag]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("datasets_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
        },
        (payload) => {
          if (payload.new.user_id === session?.user.id) {
            console.log("Invalidating datasets query, running refetch");
            queryClient.invalidateQueries({ queryKey: ['datasets'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, session]);

  const value = useMemo(
    () => ({
      data: filteredData,
      userData,
      authors,
      filter,
      setFilter,
      setFilterTag,
      collaborators,
      isLoading: isLoadingRawData || isLoadingCollaborators,
    }),
    [filteredData, userData, authors, filter, collaborators, isLoadingRawData, isLoadingCollaborators]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => useContext(DataContext);

export default DataProvider;
