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
  setFilterTag: (filterTag: string) => void;
};

const DataContext = createContext<DataContextType>({
  data: null,
  filter: "",
  setFilter: () => {},
  setFilterTag: () => {},
});

const DataProvider = (props: DataProviderProps) => {
  const [rawData, setRawData] = useState<Dataset[]>([]);
  const [data, setData] = useState<Dataset[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("");

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("metadata_dev_egu_view")
      .select("*");
    if (error) {
      console.error("Error fetching data:", error);
    } else {
      console.log("metadata fetched :", data);
      setRawData(data);
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
    fetchData();
  }, []);

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

  useEffect(() => {
    if (!rawData) return; // Early exit if data is null
    if (filter) {
      console.log("filtering");
      const filteredData = rawData.filter((item) => {
        if (filterTag === "content_type") {
          return item.content_type === filter;
        } else if (filterTag === "license") {
          return item.license === filter;
        }
        return false;
      });

      setData(filteredData);
    } else {
      setData(rawData);
    }
  }, [filter, rawData, filterTag]);

  const value = {
    data,
    filter,
    setFilter,
    setFilterTag,
  };
  return (
    <DataContext.Provider value={value}>{props.children}</DataContext.Provider>
  );
};

export const useData = () => {
  return useContext(DataContext);
};

export default DataProvider;
