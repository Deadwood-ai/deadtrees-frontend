import { useEffect, lazy, Suspense } from "react";
// const ListItem = lazy(() => import("./ListItem"));
import ListItem from "./ListItem";

export default function DataList({ data }) {
  console.log("mounting DataList with data:", data);

  return (
    <div className="h-full space-y-2 overflow-auto">
      {data ? (
        data
          // .slice(0, 10)
          .sort((a, b) => (a.uuid ? -1 : 1))
          .map((item, index) => (
            <ListItem key={index} item={item} index={index} />
          ))
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}
