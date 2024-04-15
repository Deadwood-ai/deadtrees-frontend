import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../components/useSupabase";
import { Dataset, Thumbnail } from "../types/dataset";

interface DataProviderProps {
  children: React.ReactNode;
}

type DataContextType = {
  data: Dataset[] | null;
  filter: string;
  setFilter: (filter: string) => void;
  setFilterTag: (filterTag: string) => void;
  thumbnails: Thumbnail[] | null;
};

const DataContext = createContext<DataContextType>({
  data: null,
  filter: "",
  setFilter: () => {},
  setFilterTag: () => {},
  thumbnails: null,
});

const DataProvider = (props: DataProviderProps) => {
  const [rawData, setRawData] = useState<Dataset[]>([]);
  const [data, setData] = useState<Dataset[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);

  const fetchThumbnails = async (filname_list: string[]) => {
    console.log("fetching thumbnails with:", filname_list);
    const publicURLs = filname_list.map((file_name) => {
      return {
        file_name: file_name,
        url: supabase.storage.from("thumbnails").getPublicUrl(file_name).data
          .publicUrl,
      };
    });
    console.log("publicURLs", publicURLs);
    setThumbnails(publicURLs);
  };

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("metadata_dev_egu_view_v2")
      .select("*");
    if (error) {
      console.error("Error fetching data:", error);
    } else {
      console.log("metadata_v2 fetched :", data);
      setRawData(data);
    }
  };
  useEffect(() => {
    // if (rawData) return;
    // console.log("fetching data");
    fetchData();
    // fetchThumbnails(
    //   rawData.map((item) => item.file_name?.replace("tif", "png")),
    // );
  }, []);

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
    console.log("subscribing to webhook");
    const channel = supabase
      .channel("upload_files_dev")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "upload_files_dev",
        },
        (payload) => {
          console.log("Change received via insert!", payload);
          if (
            payload.eventType === "INSERT" &&
            payload.new.status === "pending"
          ) {
            console.log("calling webhook");
            const webhookResponse = callWebhook(payload);
            console.log("webhook res", webhookResponse);
          }
          console.log("fetching data via webhook subscription");
          fetchData();
        },
      )
      .subscribe();
    console.log("fetching data via webhook initial load");
    const channel2 = supabase
      .channel("upload_files_dev")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "upload_files_dev",
        },
        (payload) => {
          console.log("Update via update !", payload);
          fetchData();
        },
      )
      .subscribe();
    // fetchData();
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channel2);
    };
  }, []);

  useEffect(() => {
    console.log("filtering data");
    if (!rawData) return; // Early exit if data is null
    if (filter) {
      console.log("filtering");
      const filteredData = rawData.filter((item) => {
        if (filterTag === "platform") {
          return item.platform === filter;
        } else if (filterTag === "license") {
          return item.license === filter;
        } else if (filterTag === "authors_image") {
          return item.authors_image === filter;
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
