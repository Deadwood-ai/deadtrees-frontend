import { useEffect, lazy, Suspense, useState } from "react";
// const ListItem = lazy(() => import("./ListItem"));
import ListItem from "./ListItem";
import { Button } from "antd";
import { useData } from "../state/DataProvider";

interface DataListProps {
  data: any[];
  hoveredItem: number | null;
  setHoveredItem: (id: number | null) => void;
  visibleFeatures: string[];
  onFilterClick: (
    filterValue: string,
    filterType: "platform" | "license" | "authors_image" | "admin_level_1" | "admin_level_3",
  ) => void;
}

export default function DataList({ data, hoveredItem, setHoveredItem, visibleFeatures, onFilterClick }: DataListProps) {
  // console.log("mounting DataList with data:", data);
  const [nItems, setNItems] = useState(50);

  const visibleData = data.filter((item) => visibleFeatures.includes(item.id));
  // console.log("visibleData", visibleData);
  // console.log("visibleFeatures", visibleFeatures);

  const handleMoreItems = () => {
    setNItems(nItems + 50);
  };

  return (
    <div className="h-full space-y-2 overflow-auto">
      {/* <div> */}
      {visibleData ? (
        visibleData
          .slice(0, nItems)
          // .sort((a, b) => (a.id ? -1 : 1))
          .map(
            (item, index) =>
              item.id && (
                <ListItem
                  key={index}
                  item={item}
                  index={index}
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                  onFilterClick={onFilterClick}
                />
              ),
          )
      ) : (
        <div>Loading...</div>
      )}
      {/* </div> */}
      {visibleData.length > nItems && (
        <div className="flex justify-center">
          <Button onClick={handleMoreItems}>Load more</Button>
        </div>
      )}
    </div>
  );
}
