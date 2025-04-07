import React, { createContext, useState, useContext } from "react";
import { View } from "ol";

interface DatasetDetailsMapViewportType {
  viewport: {
    center: number[];
    zoom: number;
    extent?: number[];
  };
  setViewport: (view: { center: number[]; zoom: number; extent?: number[] }) => void;
}

const DatasetDetailsMapContext = createContext<DatasetDetailsMapViewportType>({
  viewport: {
    center: [0, 0],
    zoom: 2,
  },
  setViewport: () => {},
});

export const DatasetDetailsMapProvider = (props: { children: React.ReactNode }) => {
  const [viewport, setViewport] = useState({
    center: [0, 0],
    zoom: 2,
  });

  return (
    <DatasetDetailsMapContext.Provider
      value={{
        viewport,
        setViewport,
      }}
    >
      {props.children}
    </DatasetDetailsMapContext.Provider>
  );
};

export const useDatasetDetailsMap = () => {
  return useContext(DatasetDetailsMapContext);
};

export default DatasetDetailsMapProvider;
