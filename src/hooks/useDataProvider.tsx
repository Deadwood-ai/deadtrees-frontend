import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../hooks/useSupabase";
import { IDataset, IThumbnail, IStats, ICollaborators } from "../types/dataset";
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
  data: IDataset[] | null;
  filter: string;
  setFilter: (filter: string) => void;
  setFilterTag: (filterTag: string) => void;
  thumbnails: IThumbnail[] | null;
  collaborators: ICollaborators[] | null;
  authors: AuthorOption[] | null;
  userData: IDataset[] | null;
};

const DataContext = createContext<DataContextType>({
  data: null,
  filter: "",
  setFilter: () => { },
  setFilterTag: () => { },
  authors: null,
  thumbnails: null,
  collaborators: null,
  userData: null,
});

const DataProvider = (props: DataProviderProps) => {
  const [rawData, setRawData] = useState<IDataset[]>([]);
  const [userData, setUserData] = useState<IDataset[]>([]);
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [data, setData] = useState<IDataset[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [thumbnails, setThumbnails] = useState<IThumbnail[]>([]);
  const [collaborators, setCollaborators] = useState<ICollaborators[]>([]);
  const { session } = useAuth();

  const fetchCollaborators = async () => {
    const { data, error } = await supabase.from("collaborators").select("*");
    if (error) {
      console.error("Error fetching data:", error);
    } else {
      console.log("collaborators fetched :", data);
      setCollaborators(data);
    }
  };

  const fetchThumbnails = async (filname_list: string[]) => {
    console.log("fetching thumbnails with:", filname_list);
    const publicURLs = filname_list.map((file_name) => {
      return {
        file_name: file_name,
        url: supabase.storage.from("thumbnails").getPublicUrl(file_name).data.publicUrl,
      };
    });
    console.log("publicURLs", publicURLs);
    setThumbnails(publicURLs);
  };

  const fetchData = async () => {
    console.log("fetching data from", Settings.DATA_TABLE_FULL);
    const { data, error } = await supabase.from(Settings.DATA_TABLE_FULL).select("*");
    if (error) {
      console.error("Error fetching data from", Settings.DATA_TABLE_FULL, ":", error);
    } else {
      console.log(Settings.DATA_TABLE_FULL, "fetched :", data);
      setRawData(data);
    }
  };

  useEffect(() => {
    console.log('initial data fetch');
    fetchData();
    fetchCollaborators();
  }, []);

  useEffect(() => {
    if (!rawData.length) return;
    console.log('filtering data');
    const filteredData = filter
      ? rawData.filter((item) => {
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
      })
      : rawData;

    setData(filteredData);
  }, [filter, rawData, filterTag]);

  const value = useMemo(() => ({
    data,
    userData,
    authors,
    filter,
    setFilter,
    setFilterTag,
    collaborators,
  }), [data, filter, collaborators]);
  return <DataContext.Provider value={value}>{props.children}</DataContext.Provider>;
};

export const useData = () => {
  return useContext(DataContext);
};

export default DataProvider;
