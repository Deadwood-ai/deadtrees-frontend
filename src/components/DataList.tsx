import { useEffect, lazy, Suspense, useState } from "react";
// const ListItem = lazy(() => import("./ListItem"));
import ListItem from "./ListItem";
import { Button } from "antd";
import { useData } from "../state/DataProvider";

export default function DataList({ data, hoveredItem, setHoveredItem }) {
  // console.log("mounting DataList with data:", data);
  const [nItems, setNItems] = useState(50);
  const { visibleFeatures } = useData();

  const visibleData = data.filter(item => visibleFeatures.includes(item.id));

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
          .map((item, index) => item.id && <ListItem key={index} item={item} index={index} hoveredItem={hoveredItem} setHoveredItem={setHoveredItem} />)
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
