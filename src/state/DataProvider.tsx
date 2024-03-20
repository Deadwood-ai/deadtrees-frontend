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
  const callWebhook = async (payload: any) => {
    const webhookURL =
      "https://processor.deadtrees.earth/api/dev/dispatch/" + payload.new.uuid;
    const webhookResponse = fetch(webhookURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "INSERT",
        schema: "public",
        table: "upload_files_dev",
        record: payload.new,
      }),
    });
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
          if (
            payload.eventType === "INSERT" &&
            payload.new.status === "pending"
          ) {
            console.log("calling webhook");
            const webhookResponse = callWebhook(payload);
            console.log("webhook res", webhookResponse);
          }
          fetchData();
        },
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
  return (
    <DataContext.Provider value={value}>{props.children}</DataContext.Provider>
  );
};

export const useData = () => {
  return useContext(DataContext);
};

export default DataProvider;
