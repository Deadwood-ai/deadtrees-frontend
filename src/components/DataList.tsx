import { useState } from "react";
import ListItem from "./ListItem";
import { Button } from "antd";
import { IDataset } from "../types/dataset";

interface DataListProps {
  data: IDataset[];
  hoveredItem: number | null;
  setHoveredItem: (id: number | null) => void;
  visibleFeatures: string[];
  onFilterClick: (
    filterValue: string,
    filterType: "platform" | "license" | "authors_image" | "admin_level_1" | "admin_level_3",
  ) => void;
}

export default function DataList({ data, hoveredItem, setHoveredItem, onFilterClick }: DataListProps) {
  const [nItems, setNItems] = useState(50);

  // Use data directly as it's already filtered by the parent component
  const visibleData = data;

  const handleMoreItems = () => {
    setNItems(nItems + 50);
  };

  return (
    <div className="h-full space-y-2 overflow-auto">
      {visibleData ? (
        visibleData
          .slice(0, nItems)
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
      {visibleData.length > nItems && (
        <div className="flex justify-center">
          <Button onClick={handleMoreItems}>Load more</Button>
        </div>
      )}
    </div>
  );
}
