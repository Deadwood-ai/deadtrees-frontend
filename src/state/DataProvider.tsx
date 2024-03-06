import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../components/useSupabase";
import { Dataset } from "../types/dataset";

interface DataProviderProps {
  children: React.ReactNode;
}

type DataContextType = {
  data: Dataset[] | null;
  filter: string;
  setFilter: (filter: string) => void;
};

const DataContext = createContext<DataContextType>({
  data: null,
  filter: "",
  setFilter: () => {},
});

const DataProvider = (props: DataProviderProps) => {
  const [data, setData] = useState<string>("");
  const [filter, setFilter] = useState<string>("");

  const fetchData = async () => {
    const { data, error } = await supabase.from("upload_files_dev").select("*");
    if (error) {
      console.error("Error fetching data:", error);
    } else {
      setData(data);
    }
  };
  useEffect(() => {
    const channel = supabase
      .channel("upload_files_dev")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "upload_files_dev",
        },
        (payload) => {
          console.log("Change received!", payload);
          fetchData();
        }
      )
      .subscribe();
    fetchData();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const value = {
    data,
    filter,
    setFilter,
  };
  return <DataContext.Provider value={value}>{props.children}</DataContext.Provider>;
};

export const useData = () => {
  return useContext(DataContext);
};

export default DataProvider;
