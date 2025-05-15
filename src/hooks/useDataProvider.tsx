import { createContext, useContext, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDatasets, useUserDatasets, useAuthors, useCollaborators } from "./useDatasets";
import { IDataset, IThumbnail, ICollaborators } from "../types/dataset";
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
  setFilter: () => {},
  setFilterTag: () => {},
  authors: undefined,
  thumbnails: undefined,
  collaborators: undefined,
  userData: undefined,
  isLoading: false,
});

const DataProvider = ({ children }: DataProviderProps) => {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data: rawData, isLoading: isLoadingRawData } = useDatasets();
  const { data: collaborators, isLoading: isLoadingCollaborators } = useCollaborators();
  const { data: authors } = useAuthors();
  const { data: userData } = useUserDatasets();

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
    [filteredData, userData, authors, filter, collaborators, isLoadingRawData, isLoadingCollaborators],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => useContext(DataContext);

export default DataProvider;
