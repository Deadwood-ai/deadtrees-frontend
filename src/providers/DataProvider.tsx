import { FC, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataContext } from "../contexts/DataContext";
import { fetchData, fetchCollaborators } from "../utils/dataFetching";
import { useAuth } from "../hooks/useAuthProvider";

interface DataProviderProps {
  children: React.ReactNode;
}

export const DataProvider: FC<DataProviderProps> = ({ children }) => {
  const { session } = useAuth();
  const [filter, setFilter] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("");

  const { data: rawData, isLoading: isLoadingRawData } = useQuery({
    queryKey: ["datasets"],
    queryFn: fetchData,
  });

  const { data: collaborators, isLoading: isLoadingCollaborators } = useQuery({
    queryKey: ["collaborators"],
    queryFn: fetchCollaborators,
  });

  const { data: userData } = useQuery({
    queryKey: ["userData", session?.user.id, rawData],
    enabled: !!session && !!rawData,
    queryFn: () => rawData?.filter((item) => item.user_id === session?.user.id) || [],
  });

  const { data: authors } = useQuery({
    queryKey: ["authors", rawData],
    enabled: !!rawData,
    queryFn: () => {
      const authorsUnique = [...new Set(rawData?.map((item) => item.authors).filter(Boolean))];
      return authorsUnique.map((author) => ({
        label: author,
        value: author,
      }));
    },
  });

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
