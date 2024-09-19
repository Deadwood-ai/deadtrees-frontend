import React, { createContext, useState, useContext } from 'react';

interface MapViewportContextType {
  viewport: { center: number[]; zoom: number };
  setViewport: (view: { center: number[]; zoom: number }) => void;
}


const MapViewportContext = createContext<MapViewportContextType>({
  viewport: { center: [0, 0], zoom: 2 },
  setViewport: () => {},
});

const DatasetMapProvider = (props: { children: React.ReactNode }) => {
    const [viewport, setViewport] = useState({ center: [0, 0], zoom: 2 });
    return (
        <MapViewportContext.Provider value={{ viewport, setViewport }}>
            {props.children}
        </MapViewportContext.Provider>
    );
};

export const useDatasetMap = () => {
    return useContext(MapViewportContext);
};

export default DatasetMapProvider;


