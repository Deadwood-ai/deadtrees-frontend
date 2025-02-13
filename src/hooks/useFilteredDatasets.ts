import { useMemo, useState } from "react";
import { IDataset } from "../types/dataset";

export function useFilteredDatasets(datasets: IDataset[] | undefined) {
  const [filter, setFilter] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const filteredData = useMemo(() => {
    if (!datasets || !filter) return datasets;
    return datasets.filter((item) => {
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
  }, [datasets, filter, filterTag]);

  return {
    filteredData,
    filter,
    setFilter,
    filterTag,
    setFilterTag,
  };
}
