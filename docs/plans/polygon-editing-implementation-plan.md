## Modular Polygon Editing — Dedicated Labeling View (Audit)

### Goals

- Provide a modular polygon editing experience in a dedicated labeling view within the Audit workflow that can be reused elsewhere.
- Allow editing of label polygons from prediction layers (deadwood, forest cover) and AI‑generated polygons.
- Keep AOI editing separate and undisturbed.
- No persistence for the demo; edits are temporary and cleared when exiting edit mode.

### Scope (confirmed)

- Add a new page/route specifically for labeling: `/datasets/:id/label-editor`.
- Add an entry button in the Audit “Ready” tab to navigate to this page.
- Supported sources to edit:
  - Deadwood predictions (MVT vector tiles)
  - Forest cover predictions (MVT vector tiles)
  - AI Segmentation results (local vector overlay)
- Multi‑select merge: Yes, limited to exactly two polygons, only if they intersect.
- Holes: Draw a polygon over a single selected polygon to subtract a hole. Disabled if multiple are selected.
- Freehand: Exposed as a toolbar button (not a key modifier).
- Undo/redo: Not in MVP.
- Snapping: Not in MVP.
- “Always activate editing if a polygon is selected”: Modify turns on automatically when a selection exists.
- Exiting edit mode: Remove temporary edited polygons and restore the base layers’ appearance.
- Do not interfere with the current AOI flow; disable AOI interactions when label edit mode is on.

### Key UX (Dedicated View)

- From the Audit “Ready” tab, click “Open Label Editor” to navigate to the new page.
- In the labeling page, show a compact toolbar:
  - Layer dropdown: Deadwood | Forest cover
  - Tools: Select/Modify (auto‑on with selection), Draw, Freehand Draw (toggle), Cut Hole, Merge, Delete, Clear, Segment (AI), Exit
  - Status area for brief messages/errors (e.g., when merge not possible)
- When the user selects a polygon from the MVT prediction layer:
  - Copy it to a local editable overlay and hide the same polygon in the MVT render to avoid double‑drawing.

### Architecture Overview (Dedicated Page)

- New page/route

  - Route: `/datasets/:id/label-editor`
  - Page: `src/pages/DatasetLabelEditor.tsx`
  - Entry point button: in `DatasetAuditDetail` (Ready tab) → navigate to the route with dataset id

- Target layers (server‑backed):

  - `VectorTileLayer` (MVT) for deadwood and forest cover predictions.
  - These are not directly editable; edits happen in an overlay layer.

- Editable overlay:

  - One `VectorLayer<VectorSource>` per edit session, holding copied features from server layers and AI outputs.
  - All edit interactions (Select, Modify, Draw) work against this overlay only.
  - On exit, overlay is cleared and removed (demo‑only behavior).

- Hiding server features during edit:

  - Maintain a `hiddenIds: Set<number|string>` representing features currently “checked‑out” for editing.
  - Override the MVT layer’s style function in `DatasetAuditMap` while in edit mode to return `null` for features with an `id` in `hiddenIds` (hides them).
  - When the edited polygon is cleared/deleted or on exit, remove the `id` from `hiddenIds` and re‑render the MVT layer.

- Hook: `usePolygonEditor`

  - Parameters:
    - `mapRef: React.RefObject<Map>`
    - `getTargetVectorTileLayer: () => VectorTileLayer | undefined` (deadwood or forest cover)
    - `getOrthoLayer: () => TileLayerWebGL | undefined` (for AI capture)
  - Returns:
    - `isEditing: boolean`, `startEditing()`, `stopEditing()`
    - `activeLayer: 'deadwood' | 'forest_cover' | null`, `setActiveLayer()`
    - `toolbarState`: flags for tool toggles (freehand, cut hole mode, merge mode)
    - `selection`: selected features in the overlay
    - `commands`: `draw()`, `toggleFreehand()`, `cutHole()`, `merge()`, `deleteSelected()`, `clearAll()`
    - `ai`: `{ isActive, isProcessing, error, enable(), disable(), clear(), canUse }`
  - Behavior:
    - Creates and owns a single overlay `VectorLayer<VectorSource>` for the session.
    - Registers `Select` + `Modify` against the overlay. Modify is auto‑enabled when selection exists.
    - Copies features from MVT to overlay on selection (via pixel hit or ID lookup). Adds their `id` to `hiddenIds` and hides them in the active MVT layer.
    - Exposes boolean operations (merge, hole) on overlay features.
    - Coordinates with AI to write new features directly into the overlay.
    - AOI is not used in the dedicated view for MVP (no AOI interactions here).

- AI integration
  - Reuse `useAISegmentation`, extended with an optional parameter to target an existing `VectorSource` (the editor’s overlay). Results go directly to the overlay.
  - While AI is running, the hook already disables other interactions; ensure the overlay remains visible.
  - After success, layers visibility is restored and new features are available for selection/editing.

### Boolean Geometry Strategy

- Library: `polygon-clipping` (Martinez algorithm). Simple, small surface, robust for union/difference.
- Operations:
  - Merge: union two polygons (validate they intersect; otherwise show a message and abort).
  - Cut hole: difference (selected polygon minus drawn hole polygon). Only allowed when a single polygon is selected.
- Implementation details:
  - Convert OL geometry → GeoJSON polygon(s) in EPSG:3857 coordinates (planar enough at local scale for edits).
  - Run boolean op via `polygon-clipping` (expects ring arrays).
  - Convert result back to OL `Polygon` or `MultiPolygon` and replace geometry in the overlay feature.
  - Maintain attribute `id` mapping; edited overlay features carry the original `id` so we can hide/show in MVT appropriately.

### Interaction Lifecycle (Dedicated View)

1. Open labeling page (navigated from Audit “Ready” tab”).

   - Create overlay layer and add to map above predictions.
   - Initialize `hiddenIds = new Set()` and wrap the active MVT layer’s style function to hide features with those ids.

2. Select/Modify

   - On selecting an MVT feature, copy to overlay, add `id` to `hiddenIds`, and refresh rendering.
   - Modify is enabled whenever selection exists.

3. Draw / Freehand Draw

   - Add new polygons directly to overlay (freehand via Draw’s `freehand: true`).

4. Merge

   - Require exactly two selected overlay features. If they intersect, union and replace with a single feature (carry `id` of one or set a synthetic temporary `id`).

5. Cut Hole

   - Require exactly one selected overlay feature.
   - Activate hole mode: user draws the hole polygon; we compute difference and update the geometry.

6. Delete / Clear

   - Delete: remove selected overlay features; remove their ids from `hiddenIds`; re‑render.
   - Clear: remove all overlay features; clear `hiddenIds`.

7. Segment (AI)

   - Enable bounding‑box tool; results are added to overlay (not a separate AI layer).
   - User can then select/modify/merge them like any other overlay feature.

8. Exit (leave page)
   - Remove overlay and clear all temporary edits.
   - Restore prediction MVT layer style function (unwrapped).

### Non‑Goals (MVP)

- Persistence to Supabase or live update of server tiles.
- Snapping and undo/redo.
- Editing AOI (already separate and working).

### Integration points

- Add a button in the Audit “Ready” tab (in `src/components/DatasetAudit/DatasetAuditDetail.tsx`) to navigate to `/datasets/:id/label-editor`.
- In `DatasetLabelEditor.tsx`, show only the currently selected prediction layer (no extra layer panel) and the ortho COG (basemap optional).
- Style hiding: wrap the active `VectorTileLayer`’s style function while editing:
  - `layer.setStyle((feature) => hiddenIds.has(feature.get('id')) ? null : baseStyle)`
  - Preserve the original base style (from `createVectorLayer`) for use when not hidden.

### Files and Modules

- `src/hooks/usePolygonEditor.ts`

  - Core editor logic, overlay creation, interactions, selection management, boolean ops, and MVT copy/hide wiring.

- `src/components/PolygonEditorToolbar.tsx`

  - Ant Design toolbar: layer select, tool buttons (draw, freehand toggle, cut hole, merge, delete, clear, AI segment, exit), status.

- `src/utils/geometry.ts`

  - Thin wrappers around `polygon-clipping` for union/difference on OL geometries.

- `src/components/DatasetAudit/DatasetAuditMap.tsx`

  - Add an "Open Label Editor" button in the Ready tab that navigates to the new page.

- `src/pages/DatasetLabelEditor.tsx`
  - Dedicated labeling map using `usePolygonEditor` and `PolygonEditorToolbar`.
  - Provides `getTargetVectorTileLayer()` (only the chosen prediction layer is added) and `getOrthoLayer()`.

### API Sketches (TypeScript)

```ts
interface UsePolygonEditorParams {
  mapRef: React.RefObject<Map>;
  getTargetVectorTileLayer: () => VectorTileLayer | undefined;
  getOrthoLayer: () => TileLayerWebGL | undefined;
}

interface UsePolygonEditorReturn {
  isEditing: boolean;
  startEditing: () => void;
  stopEditing: () => void;
  activeLayer: "deadwood" | "forest_cover" | null;
  setActiveLayer: (v: "deadwood" | "forest_cover") => void;
  selection: Feature[];
  draw: () => void;
  toggleFreehand: (on?: boolean) => void;
  cutHole: () => void;
  merge: () => void;
  deleteSelected: () => void;
  clearAll: () => void;
  ai: {
    isActive: boolean;
    isProcessing: boolean;
    error: string | null;
    enable: () => void;
    disable: () => void;
    clear: () => void;
    canUse: boolean;
  };
}
```

### Staged Implementation Plan

Stage 0 — Shell & Navigation

- Add `/datasets/:id/label-editor` route and `DatasetLabelEditor.tsx` with a basic OL map (basemap + ortho COG).
- Add “Open Label Editor” button in Audit Ready tab to navigate here.

Stage 1 — Overlay + Basic Editing

- Add editable overlay (`VectorLayer<VectorSource>`) and interactions: select, modify (auto with selection), draw, delete, clear.
- No MVT predictions yet.

Stage 2 — AI Integration

- Wire `useAISegmentation` to add results directly to the overlay.
- Add “Segment (Box)” to toolbar.

Stage 3 — Prediction Layer Integration

- Add only the selected prediction MVT layer (default: deadwood) to the map.
- Implement copy‑on‑select to overlay and `hiddenIds` style masking in the active MVT layer.

Stage 4 — Boolean Ops

- Add `polygon-clipping` dependency.
- Implement Merge (two selected & intersecting) and Cut Hole (single selected → draw hole → difference).

Stage 5 — Polish

- Layer dropdown (deadwood/forest cover), toolbar UX, messages, and performance checks.

QA (ongoing at each stage)

- Validate expected constraints (merge only if intersecting; hole only if single selection).
- Confirm masking/unmasking and temporary edits are correct.

### Risks & Notes

- Boolean ops on projected coordinates: Operating in EPSG:3857 is acceptable for local edits; for very large extents accuracy may degrade. If needed later, reproject to EPSG:4326 before boolean ops and back to map projection.
- Vector tile id stability: We rely on `feature.get('id')` from MVT tiles as a stable unique identifier. Confirmed as acceptable.
- Performance: `hiddenIds` checks in the layer style function should be fast; avoid very large sets. If polygon counts become large, consider indexing, batching, and minimal re‑styles. Do not over‑engineer for MVP.
- Future persistence: When saving is introduced, write overlay edits to Supabase, invalidate/reload the MVT source, and tear down the overlay/hiddenIds.
