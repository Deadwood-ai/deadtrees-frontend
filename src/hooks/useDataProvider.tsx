import { createContext, useContext, useMemo, useState } from "react";
import { usePublicDatasets, useUserDatasets, useAuthors } from "./useDatasets";
import { IDataset, IThumbnail } from "../types/dataset";

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
  userData: undefined,
  isLoading: false,
});

const DataProvider = ({ children }: DataProviderProps) => {

  const { data: rawData, isLoading: isLoadingRawData } = usePublicDatasets();
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
      isLoading: isLoadingRawData,
    }),
    [filteredData, userData, authors, filter, isLoadingRawData],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => useContext(DataContext);

export default DataProvider;
