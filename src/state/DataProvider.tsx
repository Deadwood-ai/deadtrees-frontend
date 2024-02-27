import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../components/useSupabase";
import { Database } from "../types/supabase";

interface DataProviderProps {
  children: React.ReactNode;
}

type DataContextType = {
  data: Database | null;
};

const DataContext = createContext<DataContextType>({
  data: null,
});

const DataProvider = (props: DataProviderProps) => {
  const [data, setData] = useState<string>("");

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
  };
  return <DataContext.Provider value={value}>{props.children}</DataContext.Provider>;
};

export const useData = () => {
  return useContext(DataContext);
};

export default DataProvider;
