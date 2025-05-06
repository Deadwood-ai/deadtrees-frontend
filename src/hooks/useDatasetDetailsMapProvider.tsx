import React, { createContext, useState, useContext } from "react";
import { View } from "ol";

// Navigation source type
export type NavigationSource = "dataset" | "navigation" | null;

interface DatasetDetailsMapViewportType {
  viewport: {
    center: number[];
    zoom: number;
    extent?: number[];
  };
  navigatedFrom: NavigationSource;
  setViewport: (view: { center: number[]; zoom: number; extent?: number[] }) => void;
  setNavigationSource: (source: NavigationSource) => void;
}

const DatasetDetailsMapContext = createContext<DatasetDetailsMapViewportType>({
  viewport: {
    center: [0, 0],
    zoom: 2,
  },
  navigatedFrom: null,
  setViewport: () => {},
  setNavigationSource: () => {},
});

export const DatasetDetailsMapProvider = (props: { children: React.ReactNode }) => {
  const [viewport, setViewport] = useState({
    center: [0, 0],
    zoom: 2,
  });
  const [navigatedFrom, setNavigationSource] = useState<NavigationSource>(null);

  return (
    <DatasetDetailsMapContext.Provider
      value={{
        viewport,
        navigatedFrom,
        setViewport,
        setNavigationSource,
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
