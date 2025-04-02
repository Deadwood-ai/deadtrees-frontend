import { useMemo, useState } from "react";
import { IDataset, IPlatform, ILicense } from "../types/dataset";

type FilterTag = "platform" | "license" | "authors_image" | "admin_level_1" | "admin_level_3";
type FilterValue = IPlatform | ILicense | string;

export function useFilteredDatasets(datasets: IDataset[] | undefined) {
  const [filter, setFilter] = useState<FilterValue>("");
  const [filterTag, setFilterTag] = useState<FilterTag>("platform");

  const filteredData = useMemo(() => {
    if (!datasets || !filter) return datasets;
    return datasets.filter((item) => {
      switch (filterTag) {
        case "platform":
          return item.platform === filter;
        case "license":
          return item.license === filter;
        case "authors_image":
          return item.authors?.includes(filter as string);
        case "admin_level_1":
          return item.admin_level_1 === filter;
        case "admin_level_3":
          return item.admin_level_3 === filter;
        default:
          return false;
      }
    });
  }, [datasets, filter, filterTag]);

  return {
    filteredData,
    filter,
    setFilter,
    filterTag,
    setFilterTag,
  };
}
