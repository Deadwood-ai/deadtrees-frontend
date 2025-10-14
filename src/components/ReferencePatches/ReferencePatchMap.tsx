import { useEffect, useMemo, useRef, useCallback } from "react";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import TileLayerWebGL from "ol/layer/WebGLTile";
import { GeoTIFF } from "ol/source";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import VectorTileLayer from "ol/layer/VectorTile";
import type Layer from "ol/layer/Layer";
import { Style, Stroke, Fill } from "ol/style";
import Feature from "ol/Feature";
import { Polygon } from "ol/geom";
import GeoJSON from "ol/format/GeoJSON";
import { Translate, Select } from "ol/interaction";
import { click } from "ol/events/condition";
import { polygon as turfPolygon, multiPolygon as turfMultiPolygon, intersect, area } from "@turf/turf";
import { useUpdatePatchGeometry } from "../../hooks/useReferencePatches";
import "ol/ol.css";
import { message } from "antd";
import { IReferencePatch, PatchResolution } from "../../types/referencePatches";
import type { LayerSelection } from "./LayerRadioButtons";
import { useDatasetAOI } from "../../hooks/useDatasetAudit";
import { useDatasetLabelTypes } from "../../hooks/useDatasetLabelTypes";
import { supabase } from "../../hooks/useSupabase";
import {
  createDeadwoodVectorLayer,
  createForestCoverVectorLayer,
  createAOIVectorLayer,
  createAOIMaskLayer,
} from "../DatasetDetailsMap/createVectorLayer";
import { Settings } from "../../config";

interface Props {
  datasetId: number;
  cogPath?: string | null;
  resolution?: PatchResolution;
  patches: IReferencePatch[] | undefined;
  onPatchSelected?: (patch: IReferencePatch | null) => void;
  focusPatchId?: number | null;
  enableTranslation?: boolean;
  onGetPatchGeometry?: (getter: (patchId: number) => GeoJSON.Polygon | null) => void;
  onGetMapRef?: (map: Map | null) => void; // Callback to pass map reference to parent
  onGetOrthoLayer?: (getter: () => TileLayerWebGL | undefined) => void; // Callback to get ortho layer for AI
  layerSelection: LayerSelection;
  selectedPatchId?: number | null;
  selectedBasePatch?: IReferencePatch | null; // For checking reference data existence
  isEditingMode?: boolean; // Disable patch selection when editing geometries
}

const TARGET_PATCH_SIZE_M: Record<PatchResolution, number> = {
  20: 204.8,
  10: 102.4,
  5: 51.2,
};

export default function ReferencePatchMap({
  datasetId,
  cogPath,
  resolution = 20,
  patches,
  onPatchSelected,
  focusPatchId,
  enableTranslation = false,
  onGetPatchGeometry,
  onGetMapRef,
  onGetOrthoLayer,
  layerSelection,
  selectedPatchId,
  selectedBasePatch,
  isEditingMode = false,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const patchLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const orthoLayerRef = useRef<TileLayerWebGL | null>(null);
  const aoiLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const aoiMaskLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const deadwoodLayerRef = useRef<VectorTileLayer | null>(null);
  const forestCoverLayerRef = useRef<VectorTileLayer | null>(null);
  const referenceDeadwoodLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const referenceForestCoverLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const translateRef = useRef<Translate | null>(null);
  const selectRef = useRef<Select | null>(null);
  const hasInitialFitRef = useRef<boolean>(false);
  const patchesRef = useRef<IReferencePatch[] | undefined>(patches);
  const previousFocusPatchIdRef = useRef<number | null>(null);
  const { mutate: updatePatchGeometry } = useUpdatePatchGeometry();
  const { data: aoiData } = useDatasetAOI(datasetId);

  // Fetch label types for predictions
  const { deadwood, forestCover } = useDatasetLabelTypes({
    datasetId,
    enabled: !!datasetId,
  });

  // Keep patchesRef in sync with patches prop
  useEffect(() => {
    patchesRef.current = patches;
  }, [patches]);

  const geoJsonFormatter = useMemo(() => new GeoJSON(), []);
  const aoiGeometry = useMemo(() => {
    if (!aoiData?.geometry) return null;
    try {
      return geoJsonFormatter.readGeometry(aoiData.geometry, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
    } catch (err) {
      console.warn("Failed to parse AOI geometry", err);
      return null;
    }
  }, [aoiData?.geometry, geoJsonFormatter]);

  const aoiTurf = useMemo(() => {
    if (!aoiGeometry) return null;
    const geoObject = geoJsonFormatter.writeGeometryObject(aoiGeometry) as GeoJSON.Geometry;
    if (geoObject.type === "Polygon") {
      return turfPolygon(geoObject.coordinates as GeoJSON.Position[][]);
    }
    if (geoObject.type === "MultiPolygon") {
      return turfMultiPolygon(geoObject.coordinates as GeoJSON.Position[][][]);
    }
    return null;
  }, [aoiGeometry, geoJsonFormatter]);

  const validatePlacementAgainstAOI = useCallback(
    (patchGeom: GeoJSON.Polygon) => {
      if (!aoiTurf) return { ok: true, overlapPercent: null };
      const patchPoly = turfPolygon(patchGeom.coordinates as GeoJSON.Position[][]);
      // @ts-expect-error - turf types are incompatible but runtime works correctly
      const overlap = intersect(patchPoly, aoiTurf);
      if (!overlap) {
        return { ok: false, message: "Patch must intersect the AOI." };
      }
      const overlapPercent = (area(overlap) / area(patchPoly)) * 100;
      if (overlapPercent < 60) {
        return { ok: false, message: `AOI coverage is ${overlapPercent.toFixed(1)}%. Minimum is 60%.` };
      }
      return { ok: true, overlapPercent };
    },
    [aoiTurf],
  );

  const hasOverlapWithExistingPatches = useCallback(
    (patchGeom: GeoJSON.Polygon, excludeId?: number) => {
      if (!patches?.length) return false;
      const candidate = turfPolygon(patchGeom.coordinates as GeoJSON.Position[][]);
      return patches.some((p) => {
        if (excludeId && p.id === excludeId) return false;
        const existing = turfPolygon((p.geometry as GeoJSON.Polygon).coordinates as GeoJSON.Position[][]);
        // @ts-expect-error - turf types are incompatible but runtime works correctly
        return !!intersect(candidate, existing);
      });
    },
    [patches],
  );

  // Initialize OL map and vector layers
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const basemap = new TileLayer({
      source: new XYZ({
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        maxZoom: 19, // OSM only provides tiles up to zoom 19
      }),
    });

    const vector = new VectorLayer({
      source: new VectorSource(),
      style: (feature) => {
        const status = feature.get("status") as string;
        const isSelected = feature.get("isSelected") as boolean;
        let strokeColor = "#9ca3af"; // gray for pending
        let strokeWidth = 3; // Thicker borders for better visibility

        if (status === "good") {
          strokeColor = "#22c55e"; // green
        } else if (status === "bad") {
          strokeColor = "#ef4444"; // red
        }

        // Highlight selected patch with thicker blue border
        if (isSelected) {
          strokeColor = "#1890ff"; // blue
          strokeWidth = 5; // Extra thick for selected patch
        }

        return new Style({
          stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
        });
      },
    });

    const view = new View({
      center: [0, 0],
      zoom: 2,
      maxZoom: 24, // Allow high zoom for detailed annotation work
      projection: "EPSG:3857",
    });

    const layers: (TileLayer<XYZ> | TileLayerWebGL | VectorLayer<VectorSource> | VectorTileLayer)[] = [basemap];
    if (cogPath) {
      const ortho = new TileLayerWebGL({
        source: new GeoTIFF({
          sources: [
            {
              url: Settings.COG_BASE_URL + cogPath,
              nodata: 0,
              bands: [1, 2, 3],
            },
          ],
          convertToRGB: true,
        }),
        maxZoom: 25, // Allow very high zoom for detailed ortho imagery
        cacheSize: 1024,
        preload: 0,
      });
      orthoLayerRef.current = ortho;
      layers.push(ortho);
    }

    // AOI and prediction layers will be added dynamically via separate useEffect

    vector.setZIndex(100); // Reference patches on top of everything
    layers.push(vector);

    const map = new Map({
      target: mapContainerRef.current,
      layers,
      view,
      controls: [],
    });

    setTimeout(() => map.updateSize(), 0);
    const handleResize = () => map.updateSize();
    window.addEventListener("resize", handleResize);
    const ro = new ResizeObserver(() => map.updateSize());
    ro.observe(mapContainerRef.current);

    const select = new Select({
      condition: click,
      layers: [vector] as Layer[],
      style: (feature) => {
        // Use the same style as the vector layer (no fill, just stroke)
        const status = feature.get("status") as string;
        const isSelected = feature.get("isSelected") as boolean;
        let strokeColor = "#9ca3af";
        let strokeWidth = 3;

        if (status === "good") {
          strokeColor = "#22c55e";
        } else if (status === "bad") {
          strokeColor = "#ef4444";
        }

        if (isSelected) {
          strokeColor = "#1890ff";
          strokeWidth = 5;
        }

        return new Style({
          stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
        });
      },
    });
    map.addInteraction(select);
    select.on("select", (e) => {
      const f = e.selected?.[0] as Feature<Polygon> | undefined;
      if (!f) {
        // Don't deselect when clicking outside patches
        // Deselection should only happen via explicit user action (X button or Esc key)
        return;
      }
      const patchId = f.get("patchId") as number | undefined;
      // Use patchesRef.current to access the latest patches array
      const patch = patchesRef.current?.find((p) => p.id === patchId) || null;
      onPatchSelected?.(patch || null);
    });
    selectRef.current = select;

    // Only enable translation if explicitly allowed and only for base patches (20cm) with pending status
    const translate = new Translate({
      layers: [vector] as Layer[],
      filter: (feature) => {
        if (!enableTranslation) return false;
        // Use patchesRef.current to access the latest patches array
        const patch = patchesRef.current?.find((p) => p.id === feature.get("patchId"));
        if (!patch) return false;
        // Only allow translation of base patches (20cm) that are pending
        return patch.resolution_cm === 20 && patch.status === "pending";
      },
    });
    map.addInteraction(translate);
    translate.on("translateend", (evt) => {
      const feature = evt.features?.item(0) as Feature<Polygon> | undefined;
      if (!feature) return;
      const patchId = feature.get("patchId") as number | undefined;
      if (!patchId) return;
      const geom = feature.getGeometry();
      if (!geom) return;

      const corrected = enforcePatchDimensions(geom as Polygon, resolution);
      feature.setGeometry(corrected);
      const gjCorrected = geoJsonFormatter.writeGeometryObject(corrected) as GeoJSON.Polygon;

      const placementValidation = validatePlacementAgainstAOI(gjCorrected);
      if (!placementValidation.ok) {
        message.error(placementValidation.message || "Patch placement invalid");
        return;
      }
      if (hasOverlapWithExistingPatches(gjCorrected, patchId)) {
        message.error("Patch overlaps an existing patch");
        return;
      }

      updatePatchGeometry({
        patchId,
        geometry: gjCorrected,
        bbox: polygonToBBoxShort(gjCorrected),
        aoiCoveragePercent: placementValidation.overlapPercent ? Math.round(placementValidation.overlapPercent) : null,
      });
      // Use patchesRef.current to access the latest patches array
      onPatchSelected?.(patchesRef.current?.find((p) => p.id === patchId) || null);
    });

    mapRef.current = map;
    patchLayerRef.current = vector;
    translateRef.current = translate;

    // Pass map reference to parent
    onGetMapRef?.(map);

    return () => {
      map.setTarget(undefined);
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
      mapRef.current = null;
      patchLayerRef.current = null;
      translateRef.current = null;
      selectRef.current = null;
      aoiLayerRef.current = null;
      aoiMaskLayerRef.current = null;
      deadwoodLayerRef.current = null;
      forestCoverLayerRef.current = null;
      // Notify parent that map is being destroyed
      onGetMapRef?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only initialize map once on mount

  // Dynamically enable/disable patch selection based on editing mode
  useEffect(() => {
    const map = mapRef.current;
    const select = selectRef.current;
    if (!map || !select) return;

    if (isEditingMode) {
      // Remove select interaction when entering editing mode
      map.removeInteraction(select);
      console.log("Disabled patch selection (editing mode active)");
    } else {
      // Re-add select interaction when exiting editing mode
      map.addInteraction(select);
      console.log("Enabled patch selection (editing mode inactive)");
    }
  }, [isEditingMode]);

  // Expose function to get current patch geometry from map (run once on mount)
  useEffect(() => {
    if (!onGetPatchGeometry) return;

    const getPatchGeometry = (patchId: number): GeoJSON.Polygon | null => {
      const layer = patchLayerRef.current;
      if (!layer) return null;
      const src = layer.getSource();
      if (!src) return null;

      const feature = src.getFeatures().find((f) => f.get("patchId") === patchId);
      if (!feature) return null;

      const geom = feature.getGeometry();
      if (!geom) return null;

      // Create formatter on demand to avoid closure issues
      const formatter = new GeoJSON();
      return formatter.writeGeometryObject(geom) as GeoJSON.Polygon;
    };

    // Call the parent's callback with our getter function once
    onGetPatchGeometry(getPatchGeometry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - the getter uses refs so it always accesses latest state

  // Expose function to get ortho layer for AI segmentation (run once on mount)
  useEffect(() => {
    if (!onGetOrthoLayer) return;

    const getOrthoLayerFunc = (): TileLayerWebGL | undefined => {
      return orthoLayerRef.current || undefined;
    };

    // Call the parent's callback with our getter function once
    onGetOrthoLayer(getOrthoLayerFunc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - the getter uses refs so it always accesses latest state

  // Render features when patches change
  useEffect(() => {
    const layer = patchLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    const src = layer.getSource();
    if (!src) return;

    // Get existing features
    const existingFeatures = src.getFeatures();
    const newIds = new Set((patches || []).map((p) => p.id));

    // Remove features that no longer exist
    existingFeatures.forEach((f) => {
      const patchId = f.get("patchId");
      if (!newIds.has(patchId)) {
        src.removeFeature(f);
      }
    });

    // Update existing features and add new ones
    (patches || []).forEach((p) => {
      const existingFeature = existingFeatures.find((f) => f.get("patchId") === p.id);

      if (existingFeature) {
        // Update existing feature properties
        existingFeature.set("status", p.status);
        // Geometry shouldn't change, but status might
      } else {
        // Add new feature
        const feature = new Feature({
          geometry: geoJsonFormatter.readGeometry(p.geometry, {
            dataProjection: "EPSG:3857",
            featureProjection: "EPSG:3857",
          }) as Polygon,
        });
        feature.set("patchId", p.id);
        feature.set("status", p.status);
        src.addFeature(feature);
      }
    });

    // Only auto-fit on first load if patches exist and we haven't done initial fit yet
    if (patches && patches.length > 0 && !hasInitialFitRef.current) {
      const extent = src.getExtent();
      map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 18, duration: 500 });
      hasInitialFitRef.current = true;
    }
  }, [patches, geoJsonFormatter]);

  // Memoize the label IDs to only trigger layer recreation when IDs actually change
  const forestCoverId = useMemo(() => forestCover.data?.id, [forestCover.data?.id]);
  const deadwoodId = useMemo(() => deadwood.data?.id, [deadwood.data?.id]);

  // Add/update prediction layers when label IDs change
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove existing prediction layers
    if (forestCoverLayerRef.current) {
      map.removeLayer(forestCoverLayerRef.current);
      forestCoverLayerRef.current = null;
    }
    if (deadwoodLayerRef.current) {
      map.removeLayer(deadwoodLayerRef.current);
      deadwoodLayerRef.current = null;
    }

    // Add forest cover prediction layer if available (z-index 12)
    if (forestCoverId) {
      const forestCoverLayer = createForestCoverVectorLayer(forestCoverId);
      if (forestCoverLayer) {
        forestCoverLayer.setZIndex(12); // Above AOI layers
        forestCoverLayerRef.current = forestCoverLayer;
        map.addLayer(forestCoverLayer);
        // Visibility will be set by the separate toggle effect
      }
    }

    // Add deadwood prediction layer if available (z-index 13)
    if (deadwoodId) {
      const deadwoodLayer = createDeadwoodVectorLayer(deadwoodId);
      if (deadwoodLayer) {
        deadwoodLayer.setZIndex(13); // Above forest cover
        deadwoodLayerRef.current = deadwoodLayer;
        map.addLayer(deadwoodLayer);
        // Visibility will be set by the separate toggle effect
      }
    }
  }, [forestCoverId, deadwoodId]);

  // Update layer visibility based on radio selection, reference data existence, and editing mode
  useEffect(() => {
    if (!deadwoodLayerRef.current || !forestCoverLayerRef.current) return;

    // If in editing mode, hide ALL prediction layers (both global and reference)
    if (isEditingMode) {
      deadwoodLayerRef.current.setVisible(false);
      forestCoverLayerRef.current.setVisible(false);
      if (referenceDeadwoodLayerRef.current) referenceDeadwoodLayerRef.current.setVisible(false);
      if (referenceForestCoverLayerRef.current) referenceForestCoverLayerRef.current.setVisible(false);
      return;
    }

    // Check if selected patch has reference data
    const hasReferenceData =
      selectedBasePatch &&
      (selectedBasePatch.reference_deadwood_label_id || selectedBasePatch.reference_forest_cover_label_id);

    // If patch has reference data, hide global predictions and show reference layers instead
    if (hasReferenceData) {
      deadwoodLayerRef.current.setVisible(false);
      forestCoverLayerRef.current.setVisible(false);

      // Reference layers visibility controlled by separate effect below
      return;
    }

    // Show global predictions based on layer selection (no reference data yet, or no patch selected)
    switch (layerSelection) {
      case "deadwood":
        deadwoodLayerRef.current.setVisible(true);
        forestCoverLayerRef.current.setVisible(false);
        break;
      case "forest_cover":
        deadwoodLayerRef.current.setVisible(false);
        forestCoverLayerRef.current.setVisible(true);
        break;
      case "ortho_only":
        deadwoodLayerRef.current.setVisible(false);
        forestCoverLayerRef.current.setVisible(false);
        break;
    }

    // Hide reference layers when showing global predictions
    if (referenceDeadwoodLayerRef.current) referenceDeadwoodLayerRef.current.setVisible(false);
    if (referenceForestCoverLayerRef.current) referenceForestCoverLayerRef.current.setVisible(false);
  }, [layerSelection, selectedPatchId, selectedBasePatch, isEditingMode]);

  // Load and display reference geometries when patch has reference data
  useEffect(() => {
    const loadReferenceGeometries = async () => {
      const map = mapRef.current;
      if (!map || !selectedBasePatch) {
        console.log("[Map] Reference geometries: map or selectedBasePatch not available");
        return;
      }

      const hasReferenceData =
        selectedBasePatch.reference_deadwood_label_id || selectedBasePatch.reference_forest_cover_label_id;

      console.log("[Map] Loading reference geometries for patch:", selectedBasePatch.id, {
        hasReferenceData,
        deadwoodLabelId: selectedBasePatch.reference_deadwood_label_id,
        forestCoverLabelId: selectedBasePatch.reference_forest_cover_label_id,
        layerSelection,
        isEditingMode,
      });

      if (!hasReferenceData) {
        // Clean up reference layers if no reference data
        console.log("No reference data, cleaning up layers");
        if (referenceDeadwoodLayerRef.current) {
          map.removeLayer(referenceDeadwoodLayerRef.current);
          referenceDeadwoodLayerRef.current = null;
        }
        if (referenceForestCoverLayerRef.current) {
          map.removeLayer(referenceForestCoverLayerRef.current);
          referenceForestCoverLayerRef.current = null;
        }
        return;
      }

      // Load deadwood reference geometries
      if (selectedBasePatch.reference_deadwood_label_id) {
        console.log("Fetching deadwood geometries for label:", selectedBasePatch.reference_deadwood_label_id);
        const { data: deadwoodGeoms, error } = await supabase
          .from("reference_patch_deadwood_geometries")
          .select("geometry")
          .eq("label_id", selectedBasePatch.reference_deadwood_label_id);

        if (error) {
          console.error("Error fetching deadwood geometries:", error);
        } else {
          console.log("Fetched deadwood geometries:", deadwoodGeoms?.length || 0);
        }

        if (deadwoodGeoms && deadwoodGeoms.length > 0) {
          // Remove old layer if exists
          if (referenceDeadwoodLayerRef.current) {
            map.removeLayer(referenceDeadwoodLayerRef.current);
          }

          // Create new vector source and layer
          const source = new VectorSource();
          const geoJsonFormatter = new GeoJSON({
            dataProjection: "EPSG:4326", // Data is in WGS84
            featureProjection: "EPSG:3857", // Map is in Web Mercator
          });

          deadwoodGeoms.forEach((g, idx) => {
            try {
              const feature = new Feature(geoJsonFormatter.readGeometry(g.geometry));
              source.addFeature(feature);
            } catch (e) {
              console.error(`Failed to parse deadwood geometry ${idx}:`, e, g.geometry);
            }
          });

          const layer = new VectorLayer({
            source,
            style: new Style({
              stroke: new Stroke({ color: "#8B4513", width: 3 }), // Brown for deadwood, thicker
              fill: new Fill({ color: "rgba(139, 69, 19, 0.15)" }), // Light brown fill
            }),
            zIndex: 100, // Higher z-index to ensure visibility above ortho/MVT layers
          });

          referenceDeadwoodLayerRef.current = layer;
          map.addLayer(layer);
          // Hide reference layers during editing mode
          const visible = !isEditingMode && layerSelection === "deadwood";
          layer.setVisible(visible);
          console.log("Added deadwood layer, visible:", visible, "features:", source.getFeatures().length);
        }
      }

      // Load forest cover reference geometries
      if (selectedBasePatch.reference_forest_cover_label_id) {
        console.log("Fetching forest cover geometries for label:", selectedBasePatch.reference_forest_cover_label_id);
        const { data: forestCoverGeoms, error } = await supabase
          .from("reference_patch_forest_cover_geometries")
          .select("geometry")
          .eq("label_id", selectedBasePatch.reference_forest_cover_label_id);

        if (error) {
          console.error("Error fetching forest cover geometries:", error);
        } else {
          console.log("Fetched forest cover geometries:", forestCoverGeoms?.length || 0);
        }

        if (forestCoverGeoms && forestCoverGeoms.length > 0) {
          // Remove old layer if exists
          if (referenceForestCoverLayerRef.current) {
            map.removeLayer(referenceForestCoverLayerRef.current);
          }

          // Create new vector source and layer
          const source = new VectorSource();
          const geoJsonFormatter = new GeoJSON({
            dataProjection: "EPSG:4326", // Data is in WGS84
            featureProjection: "EPSG:3857", // Map is in Web Mercator
          });

          forestCoverGeoms.forEach((g, idx) => {
            try {
              const feature = new Feature(geoJsonFormatter.readGeometry(g.geometry));
              source.addFeature(feature);
            } catch (e) {
              console.error(`Failed to parse forest cover geometry ${idx}:`, e, g.geometry);
            }
          });

          const layer = new VectorLayer({
            source,
            style: new Style({
              stroke: new Stroke({ color: "#228B22", width: 3 }), // Green for forest cover, thicker
              fill: new Fill({ color: "rgba(34, 139, 34, 0.15)" }), // Light green fill
            }),
            zIndex: 100, // Higher z-index to ensure visibility above ortho/MVT layers
          });

          referenceForestCoverLayerRef.current = layer;
          map.addLayer(layer);
          // Hide reference layers during editing mode
          const visible = !isEditingMode && layerSelection === "forest_cover";
          layer.setVisible(visible);
          console.log("Added forest cover layer, visible:", visible, "features:", source.getFeatures().length);
        }
      }
    };

    loadReferenceGeometries();
  }, [selectedBasePatch, layerSelection, isEditingMode]);

  // Add/update AOI layers when geometry becomes available
  useEffect(() => {
    if (!mapRef.current || !aoiData?.geometry) return;
    const map = mapRef.current;

    // Remove existing AOI layers if they exist
    if (aoiLayerRef.current) {
      map.removeLayer(aoiLayerRef.current);
      aoiLayerRef.current = null;
    }
    if (aoiMaskLayerRef.current) {
      map.removeLayer(aoiMaskLayerRef.current);
      aoiMaskLayerRef.current = null;
    }

    // Use the original geometry from aoiData (in EPSG:4326)
    // The helper functions handle the coordinate transformation internally
    const aoiGeoJSON = aoiData.geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon;

    // Create and add mask layer (grays out areas outside AOI)
    const aoiMaskLayer = createAOIMaskLayer(aoiGeoJSON);
    if (aoiMaskLayer) {
      aoiMaskLayerRef.current = aoiMaskLayer;
      aoiMaskLayer.setVisible(true); // AOI always visible
      aoiMaskLayer.setZIndex(10); // Lowest prediction layer
      map.addLayer(aoiMaskLayer);
    }

    // Create and add AOI boundary layer
    const aoiLayer = createAOIVectorLayer(aoiGeoJSON);
    if (aoiLayer) {
      aoiLayerRef.current = aoiLayer;
      aoiLayer.setVisible(true); // AOI always visible
      aoiLayer.setZIndex(11); // Just above mask
      map.addLayer(aoiLayer);
    }
  }, [aoiData?.geometry]);

  // Fit view to ortho extent
  useEffect(() => {
    if (!mapRef.current || !orthoLayerRef.current) return;
    const map = mapRef.current;
    const source = orthoLayerRef.current.getSource();
    source
      ?.getView()
      .then((vo) => {
        const viewOptions = vo as { extent?: [number, number, number, number] };
        if (viewOptions?.extent) {
          map.getView().fit(viewOptions.extent, { padding: [20, 20, 20, 20], maxZoom: 22, duration: 200 });
        }
      })
      .catch(() => {});
  }, [cogPath]);

  // Zoom to specific patch and sync selection when focusPatchId changes
  useEffect(() => {
    if (!mapRef.current) return;

    const select = selectRef.current;
    const layer = patchLayerRef.current;

    // If focusPatchId is null, clear selection
    if (!focusPatchId) {
      if (select) {
        select.getFeatures().clear();
      }
      if (layer) {
        const src = layer.getSource();
        if (src) {
          // Clear isSelected property on all features
          src.getFeatures().forEach((f) => f.set("isSelected", false));
        }
      }
      previousFocusPatchIdRef.current = null;
      return;
    }

    // Only zoom if focusPatchId actually changed
    if (previousFocusPatchIdRef.current === focusPatchId) return;

    // Use patchesRef to get current patches without triggering on patches changes
    const patches = patchesRef.current;
    if (!patches) return;

    const patch = patches.find((p) => p.id === focusPatchId);
    if (!patch) return;

    // Sync the OpenLayers Select interaction with focusPatchId
    if (select && layer) {
      const src = layer.getSource();
      if (src) {
        // Find the feature with matching patchId
        const features = src.getFeatures();
        const featureToSelect = features.find((f) => f.get("patchId") === focusPatchId);

        if (featureToSelect) {
          // Clear current selection and select the new feature
          select.getFeatures().clear();
          select.getFeatures().push(featureToSelect);

          // Update isSelected property on all features
          features.forEach((f) => {
            f.set("isSelected", f.get("patchId") === focusPatchId);
          });
        }
      }
    }

    try {
      const geometry = geoJsonFormatter.readGeometry(patch.geometry, {
        dataProjection: "EPSG:3857",
        featureProjection: "EPSG:3857",
      });
      const extent = geometry.getExtent();
      const view = mapRef.current.getView();

      // Use fit with padding for smooth animation
      view.fit(extent, {
        padding: [30, 30, 30, 30], // Reduced padding for closer zoom
        maxZoom: 24, // Allow high zoom for detailed patch viewing
        duration: 400,
      });

      // Update the previous focus patch ID after zooming
      previousFocusPatchIdRef.current = focusPatchId;
    } catch (error) {
      console.error("Failed to zoom to patch:", error);
    }
  }, [focusPatchId, geoJsonFormatter]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full bg-gray-100" />
    </div>
  );
}

function enforcePatchDimensions(geometry: Polygon, resolution: PatchResolution): Polygon {
  const size = TARGET_PATCH_SIZE_M[resolution];
  const extent = geometry.getExtent();
  const cx = (extent[0] + extent[2]) / 2;
  const cy = (extent[1] + extent[3]) / 2;
  const half = size / 2;
  return new Polygon([
    [
      [cx - half, cy - half],
      [cx + half, cy - half],
      [cx + half, cy + half],
      [cx - half, cy + half],
      [cx - half, cy - half],
    ],
  ]);
}

function polygonToBBoxShort(geometry: GeoJSON.Polygon): { minx: number; miny: number; maxx: number; maxy: number } {
  const coords = geometry.coordinates[0];
  const [minx, miny] = coords[0];
  const [maxx, maxy] = coords[2];
  return { minx, miny, maxx, maxy };
}
