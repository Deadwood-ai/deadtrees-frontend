import { useEffect, useRef, useCallback } from "react";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import type { Map as OLMap } from "ol";
import type TileLayerWebGL from "ol/layer/WebGLTile.js";

import { getWaybackTileUrl } from "../../../utils/waybackVersions";

// Latest Wayback release for satellite imagery
const DEFAULT_WAYBACK_RELEASE = 31144;

export type MapStyle = string;

export interface UseBaseLayersOptions {
	/** Map instance */
	map: OLMap | null;
	/** Map style - determines basemap source (satellite-streets-v12 or streets) */
	mapStyle: string;
	/** Whether drone imagery (ortho) is visible */
	showDroneImagery?: boolean;
	/** Ortho layer ref (from useMapCore) */
	orthoLayer?: TileLayerWebGL | null;
}

export interface UseBaseLayersReturn {
	/** Basemap layer */
	basemapLayer: TileLayer<XYZ> | null;
	/** Set basemap visibility */
	setBasemapVisible: (visible: boolean) => void;
	/** Set drone imagery visibility */
	setDroneImageryVisible: (visible: boolean) => void;
}

/**
 * Hook for managing base layers (basemap + ortho)
 * 
 * Creates and manages:
 * - Basemap tile layer (satellite wayback or OSM)
 * - Ortho COG visibility
 */
export function useBaseLayers({
	map,
	mapStyle,
	showDroneImagery = true,
	orthoLayer,
}: UseBaseLayersOptions): UseBaseLayersReturn {
	const basemapLayerRef = useRef<TileLayer<XYZ> | null>(null);
	const isInitializedRef = useRef(false);

	// Create basemap when map is ready
	useEffect(() => {
		if (!map || isInitializedRef.current) return;

		const isSatellite = mapStyle === "satellite-streets-v12";
		const basemapLayer = new TileLayer({
			preload: 0,
			source: new XYZ({
				url: isSatellite
					? getWaybackTileUrl(DEFAULT_WAYBACK_RELEASE)
					: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
				attributions: isSatellite
					? "Imagery © Esri World Imagery Wayback, Maxar, Earthstar Geographics"
					: "© OpenStreetMap contributors",
				// Wayback imagery only reliably supports zoom 18, OSM supports 19
				maxZoom: isSatellite ? 18 : 19,
				crossOrigin: "anonymous",
			}),
		});

		// Insert at bottom (index 0) so it's below ortho
		map.getLayers().insertAt(0, basemapLayer);
		basemapLayerRef.current = basemapLayer;
		isInitializedRef.current = true;

		// Cleanup
		return () => {
			if (basemapLayerRef.current && map) {
				map.removeLayer(basemapLayerRef.current);
				const source = basemapLayerRef.current.getSource();
				if (source && "dispose" in source) (source as any).dispose();
				basemapLayerRef.current = null;
			}
			isInitializedRef.current = false;
		};
	}, [map, mapStyle]);

	// Update basemap source when style changes
	useEffect(() => {
		if (!basemapLayerRef.current || !map) return;

		// Get current view state to restore after source change
		const currentView = map.getView();
		const currentCenter = currentView.getCenter();
		const currentZoom = currentView.getZoom();

		const isSatellite = mapStyle === "satellite-streets-v12";
		basemapLayerRef.current.setSource(
			new XYZ({
				url: isSatellite
					? getWaybackTileUrl(DEFAULT_WAYBACK_RELEASE)
					: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
				attributions: isSatellite
					? "Imagery © Esri World Imagery Wayback, Maxar, Earthstar Geographics"
					: "© OpenStreetMap contributors",
				// Wayback imagery only reliably supports zoom 18, OSM supports 19
				maxZoom: isSatellite ? 18 : 19,
				crossOrigin: "anonymous",
			})
		);

		// Restore view state
		if (currentCenter && currentZoom) {
			currentView.setCenter(currentCenter);
			currentView.setZoom(currentZoom);
		}
	}, [map, mapStyle]);

	// Update ortho visibility
	useEffect(() => {
		if (orthoLayer) {
			orthoLayer.setVisible(showDroneImagery);
		}
	}, [orthoLayer, showDroneImagery]);

	// Visibility setters
	const setBasemapVisible = useCallback((visible: boolean) => {
		basemapLayerRef.current?.setVisible(visible);
	}, []);

	const setDroneImageryVisible = useCallback((visible: boolean) => {
		orthoLayer?.setVisible(visible);
	}, [orthoLayer]);

	return {
		basemapLayer: basemapLayerRef.current,
		setBasemapVisible,
		setDroneImageryVisible,
	};
}
