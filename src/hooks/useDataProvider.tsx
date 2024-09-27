import { createContext, useContext, useEffect, useState } from "react";
import { IDataset, IThumbnail, IStats, ICollaborators } from "../types/dataset";
import { Settings } from "../config";
import { supabase } from "../useSupabase";
import { useAuth } from "./useAuthProvider";


interface DataProviderProps {
  children: React.ReactNode;
}

type DataContextType = {
  data: IDataset[] | null;
  filter: string;
  setFilter: (filter: string) => void;
  setFilterTag: (filterTag: string) => void;
  thumbnails: IThumbnail[] | null;
  collaborators: ICollaborators[] | null;
  userData: IDataset[] | null;
};

const DataContext = createContext<DataContextType>({
  data: null,
  filter: "",
  setFilter: () => { },
  setFilterTag: () => { },
  thumbnails: null,
  collaborators: null,
  userData: null,
});

const DataProvider = (props: DataProviderProps) => {
  const [rawData, setRawData] = useState<IDataset[]>([]);
  const [userData, setUserData] = useState<IDataset[]>([]);
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
    const { data, error } = await supabase.from(Settings.DATA_TABLE_FULL).select("*");
    if (error) {
      console.error("Error fetching data from", Settings.DATA_TABLE_FULL, ":", error);
    } else {
      console.log(Settings.DATA_TABLE_FULL, "fetched :", data);
      setRawData(data);
    }
  };

  useEffect(() => {
    if (rawData) {
      const filteredUserData = rawData.filter((item) => item.user_id === session?.user.id);
      setUserData(filteredUserData);
    }
  }, [rawData, session]);


  useEffect(() => {
    // if (rawData) return;
    // console.log("fetching data");
    const channel = supabase
      .channel("datasets_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
        }, (payload) => {
          console.log("Change received in DataProvider!", payload);
          console.log('user:', session);
          if (payload.new.user_id === session?.user.id) {
            console.log("Change received in DataProvider with same user id!", payload);
            fetchData();
          }
        }).subscribe();

    fetchData();
    fetchCollaborators();

    return () => {
      supabase.removeChannel(channel);
    }
    // fetchThumbnails(
    //   rawData.map((item) => item.file_name?.replace("tif", "png")),
    // );
  }, [supabase, session]);

  // const callWebhook = async (payload: any) => {
  //   const webhookURL = "https://processor.deadtrees.earth/api/dev/dispatch/" + payload.new.uuid;
  //   const webhookResponse = fetch(webhookURL, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       type: "INSERT",
  //       schema: "public",
  //       table: "upload_files_dev",
  //       record: payload.new,
  //     }),
  //   });
  // };
  // subscription to webhook
  // useEffect(() => {
  //   console.log("subscribing to webhook");
  //   const channel = supabase
  //     .channel("metadata_changes")
  //     .on(
  //       "postgres_changes",
  //       {
  //         event: "INSERT",
  //         schema: "public",
  //         table: "v1_metadata",
  //       },
  //       (payload) => {
  //         console.log("Change received via insert!", payload);
  //         // if (payload.eventType === "INSERT" && payload.new.status === "pending") {
  //         fetchData();
  //       },
  //     )
  //     .subscribe();

  //   // fetchData();
  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // }, []);

  // filtering data
  useEffect(() => {
    if (!rawData) return; // Early exit if data is null
    console.log("filtering data");
    if (filter) {
      console.log("filtering");
      const filteredData = rawData.filter((item) => {
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

      setData(filteredData);
    } else {
      setData(rawData);
    }
  }, [filter, rawData, filterTag]);

  const value = {
    data,
    userData,
    filter,
    setFilter,
    setFilterTag,
    collaborators,
  };
  return <DataContext.Provider value={value}>{props.children}</DataContext.Provider>;
};

export const useData = () => {
  return useContext(DataContext);
};

export default DataProvider;
