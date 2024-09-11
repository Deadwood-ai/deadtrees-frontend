import { useEffect, lazy, Suspense, useState } from "react";
// const ListItem = lazy(() => import("./ListItem"));
import ListItem from "./ListItem";
import { Button } from "antd";

export default function DataList({ data }) {
  console.log("mounting DataList with data:", data);
  const [nItems, setNItems] = useState(50);

  const handleMoreItems = () => {
    setNItems(nItems + 50);
  };

  return (
    <div className="h-full space-y-2 overflow-auto">
      {/* <div> */}
      {data ? (
        data
          .slice(0, nItems)
          .sort((a, b) => (a.id ? -1 : 1))
          .map((item, index) => item.id && <ListItem key={index} item={item} index={index} />)
      ) : (
        <div>Loading...</div>
      )}
      {/* </div> */}
      <div className="flex justify-center">
        <Button onClick={handleMoreItems}>Load more</Button>
      </div>
    </div>
  );
}
