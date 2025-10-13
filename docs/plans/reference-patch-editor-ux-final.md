# Reference Patch Label Editor - Final UX Specification

## Executive Summary

Integrate polygon editing into Reference Patch QA workflow with modal editing UI, single-layer selection, and automatic reference geometry versioning.

---

## Problem Context & Goals

### The Challenge

ML models generate predictions for deadwood and forest cover geometries. However:

1. **Model predictions need human validation and correction** before being used as training data
2. **Re-running models would delete user corrections** if not properly separated from predictions
3. **Training patches need curated reference data** that remains stable across model iterations
4. **Users need to edit geometries within specific patch boundaries** to maintain spatial organization

### The Solution

Create a **patch-based reference labeling system** that:

- ✅ Stores user-corrected geometries in **separate tables** (`reference_patch_deadwood_geometries`, `reference_patch_forest_cover_geometries`)
- ✅ Links reference data to specific reference patches (per-patch versioning)
- ✅ Allows editing at any resolution (20cm base patches, 10cm, or 5cm sub-patches)
- ✅ Provides version control with revert capabilities
- ✅ Maintains a clean modal editing UX (sidebar ↔ toolbar)
- ✅ Single-layer selection model (radio buttons) for clarity

---

## User Workflows & Scenarios

### Workflow 1: Creating a New Reference Patch Set

**Starting Point**: User has a dataset with model predictions (deadwood + forest cover) already generated.

**Steps**:

1. User navigates to Dataset Reference Patch Editor page
2. Map displays global model predictions (MVT layers)
3. **Layer radio buttons**: Deadwood (default) / Forest Cover / Ortho Only
4. User clicks "Add Base Patch"
5. User positions 20cm base patch (with optional translate for precise placement)
6. User clicks "Generate Sub-patches"
7. **System auto-copies predictions within patch bbox** → creates reference v1 in separate tables
8. System generates 4× 10cm + 16× 5cm nested patches
9. Base patch marked as "good"
10. User auto-selected to first 10cm sub-patch for QA

**Result**: Base patch now has `reference_deadwood_label_id` and `reference_forest_cover_label_id` pointing to version 1 labels. Geometries stored in `reference_patch_deadwood_geometries` and `reference_patch_forest_cover_geometries` tables.

---

### Workflow 2: Editing Reference Geometries (First Time)

**Starting Point**: Base patch with reference data (from Workflow 1).

**Steps**:

1. User selects base patch (or any sub-patch)
2. Sidebar shows patch details + navigation buttons
3. **Radio buttons**: Currently showing "Deadwood" (default)
4. User clicks **"Edit Deadwood"** button (below navigation)
5. **Sidebar hides, editing toolbar appears (top-right)**
6. Map overlay shows existing deadwood geometries (loaded from `reference_patch_deadwood_geometries`)
7. User performs edits:
   - Draw new polygons
   - Modify existing polygons (drag vertices)
   - Delete unwanted polygons
   - Merge overlapping polygons
   - Cut holes in polygons
   - Use AI segmentation (draw bbox, get SAM predictions)
8. User clicks "Save" in toolbar
9. **System creates version 2** of reference label (keeps v1 for revert)
10. Toolbar hides, sidebar returns
11. Map updates to show new reference geometries

**Result**: Base patch's `reference_deadwood_label_id` now points to version 2. New geometries stored in `reference_patch_deadwood_geometries` table.

---

### Workflow 3: Switching Layers During Review

**Starting Point**: User is reviewing a patch with reference data.

**Steps**:

1. User selects patch → Deadwood layer visible (default)
2. User presses `K` key (or clicks "Forest Cover" radio button)
3. Map switches to show forest cover reference geometries
4. **"Edit Deadwood" button changes to "Edit Forest Cover"**
5. User can now edit forest cover if needed
6. User presses `L` key (or clicks "Ortho Only" radio button)
7. Only orthophoto visible, no vector layers
8. Edit button becomes disabled (grayed out)
9. User presses `J` key to switch back to Deadwood

**Result**: Single-layer selection prevents visual clutter and makes editing intent clear.

---

### Workflow 4: Editing from a Sub-patch

**Starting Point**: User is viewing a 10cm or 5cm sub-patch.

**Steps**:

1. User selects 10cm sub-patch (e.g., during QA workflow)
2. Sidebar shows sub-patch details
3. Radio buttons: "Forest Cover" selected
4. User clicks "Edit Forest Cover"
5. **System walks up parent chain to find base patch (20cm)**
6. System loads base patch's forest cover reference geometries from `reference_patch_forest_cover_geometries`
7. Editing toolbar appears, user edits
8. User clicks "Save"
9. **System updates BASE patch's reference** (not sub-patch)
10. All sub-patches inherit the updated reference

**Result**: Edits always apply to base patch, maintaining consistency across all nested patches.

---

### Workflow 5: Reverting to Previous Version

**Starting Point**: User has edited reference multiple times (v1, v2, v3...).

**Steps**:

1. User selects base patch
2. User clicks "Edit Deadwood" → enters editing mode
3. **Toolbar shows "Version History" button** (top-right, next to other controls)
4. User clicks "Version History" → side panel opens
5. Timeline shows:
   ```
   v3 (current) - 2025-10-09 15:30 | 15 polygons
   v2 - 2025-10-09 14:45 | 18 polygons | [Revert]
   v1 - 2025-10-09 14:15 | 18 polygons | [Revert]
   ```
6. User clicks "Revert" on v2
7. System:
   - Marks v3 as `is_active=false`
   - Creates new label (v4) referencing v2's geometries
   - Sets v4 as `is_active=true`
   - Updates patch's `reference_deadwood_label_id` to v4
8. Map refreshes, showing v2 geometries

**Result**: User can undo mistakes without losing history.

---

### Workflow 6: Deselecting a Patch

**Starting Point**: User has a patch selected.

**Steps**:

**Option 1: Click X button**

1. User clicks **[X]** in sidebar header
2. Patch deselects
3. Map switches back to global predictions
4. Sidebar hides

**Option 2: Press Esc key**

1. User presses `Esc` key
2. Patch deselects
3. Map switches back to global predictions
4. Sidebar hides

**What DOESN'T deselect**:

- ❌ Clicking elsewhere on map (zooming, panning)
- ❌ Clicking on another patch border (switches selection, doesn't deselect)

**Result**: Prevents accidental deselection, maintains user context.

---

### Workflow 7: Working with Multiple Base Patches

**Starting Point**: User has created 3 base patches in different areas of the dataset.

**Steps**:

1. User selects Patch #1 → sidebar shows, reference geometries display (Deadwood default)
2. User edits Patch #1 deadwood → saves
3. User clicks on Patch #2 border (directly switches selection)
4. Patch #2 sidebar shows, Patch #2 reference geometries display (Deadwood default)
5. User switches to Forest Cover radio button
6. User edits Patch #2 forest cover → saves
7. User cycles through patches for QA
8. User clicks **[X]** in sidebar to deselect
9. **Map switches to show global predictions**

**Result**: Each base patch maintains independent reference data. Explicit deselection prevents confusion.

---

## State Transitions & Data Flow

### Application State Machine

```
┌─────────────────────┐
│ NO PATCH SELECTED   │
│ - Show MVT pred     │
│ - Radio: D/F/O      │
│ - Add Patch btn     │
└──────────┬──────────┘
           │ (select patch)
           ▼
┌─────────────────────────────┐
│ PATCH SELECTED (Normal)     │
│ - Show reference layers     │
│ - Sidebar visible [X] btn   │
│ - Radio: active layer       │
│ - Edit [Layer] btn enabled  │
└─────┬────────────────┬──────┘
      │                │
      │ (edit btn)     │ (X btn / Esc)
      ▼                │
┌───────────────┐      │
│ EDITING MODE  │      │
│ - Toolbar vis │      │
│ - Sidebar hide│      │
│ - Overlay edit│      │
│ - Ver History │      │
└─────┬─────────┘      │
      │ (save/cancel)  │
      └────────────────┘
```

### Data Flow: Reference Creation

```
Model Predictions (MVT)
  │
  │ (user clicks "Generate Sub-patches")
  ▼
Extract geometries within patch bbox
  │
  ▼
Create v2_labels entry
  - label_source='reference_patch'
  - reference_patch_id=42
  - label_data='deadwood'
  - version=1
  │
  ▼
Insert geometries to reference_patch_deadwood_geometries
  - label_id=100 (references v2_labels)
  - patch_id=42
  - geometry (JSONB GeoJSON)
  │
  ▼
Update reference_patches
  - reference_deadwood_label_id=100
```

### Data Flow: Editing Session

```
User clicks "Edit Deadwood"
  │
  ▼
Fetch geometries:
  SELECT g.* FROM reference_patch_deadwood_geometries g
  WHERE g.patch_id = 42
    AND g.label_id = (
      SELECT id FROM v2_labels
      WHERE reference_patch_id = 42
        AND label_data = 'deadwood'
        AND is_active = true
    )
  │
  ▼
Load into OpenLayers overlay (editable)
  │
  ▼
User edits (draw, modify, delete, merge, AI segment)
  │
  ▼
User clicks "Save"
  │
  ▼
Extract features from overlay
  │
  ▼
Clip to patch bbox (with 10m buffer)
  │
  ▼
Create NEW v2_labels entry
  - parent_label_id=100 (previous version)
  - version=2
  - is_active=true
  │
  ▼
Mark old label as inactive
  UPDATE v2_labels SET is_active=false WHERE id=100
  │
  ▼
Insert new geometries to reference_patch_deadwood_geometries
  │
  ▼
Update patch reference
  UPDATE reference_patches
  SET reference_deadwood_label_id=101
  WHERE id=42
```

---

## Layer Display Logic (Critical)

### When NO patch is selected:

```typescript
// Show global model predictions (MVT)
const activeLayer = layerSelection; // 'deadwood' | 'forest_cover' | 'ortho_only'

if (activeLayer === "deadwood") {
  deadwoodLayerRef.current?.setVisible(true);
  forestCoverLayerRef.current?.setVisible(false);
} else if (activeLayer === "forest_cover") {
  deadwoodLayerRef.current?.setVisible(false);
  forestCoverLayerRef.current?.setVisible(true);
} else {
  deadwoodLayerRef.current?.setVisible(false);
  forestCoverLayerRef.current?.setVisible(false);
}

// AOI always visible
aoiLayerRef.current?.setVisible(true);

// Reference layers hidden
referenceLayers.deadwood?.setVisible(false);
referenceLayers.forestCover?.setVisible(false);
```

### When patch IS selected (Normal Mode):

```typescript
// Hide global predictions
deadwoodLayerRef.current?.setVisible(false);
forestCoverLayerRef.current?.setVisible(false);

// Show tile-specific reference based on radio selection
const activeLayer = layerSelection; // 'deadwood' | 'forest_cover' | 'ortho_only'

if (activeLayer === "deadwood" && basePatch.reference_deadwood_label_id) {
  const geoms = await fetchGeometriesFromTable(
    "reference_patch_deadwood_geometries",
    basePatch.reference_deadwood_label_id,
  );
  displayAsVectorLayer(geoms, "deadwood");
  referenceLayers.forestCover?.setVisible(false);
} else if (activeLayer === "forest_cover" && basePatch.reference_forest_cover_label_id) {
  const geoms = await fetchGeometriesFromTable(
    "reference_patch_forest_cover_geometries",
    basePatch.reference_forest_cover_label_id,
  );
  displayAsVectorLayer(geoms, "forest_cover");
  referenceLayers.deadwood?.setVisible(false);
} else {
  // Ortho only
  referenceLayers.deadwood?.setVisible(false);
  referenceLayers.forestCover?.setVisible(false);
}

// AOI always visible
aoiLayerRef.current?.setVisible(true);
```

### When EDITING mode active:

```typescript
// Hide all layers except overlay
referenceLayers.deadwood?.setVisible(false);
referenceLayers.forestCover?.setVisible(false);
deadwoodLayerRef.current?.setVisible(false);
forestCoverLayerRef.current?.setVisible(false);

// Show only overlay (editable)
editor.getOverlayLayer()?.setVisible(true);

// AOI still visible for context
aoiLayerRef.current?.setVisible(true);

// Hide radio buttons during editing
setLayerRadioVisible(false);
```

---

## Key Technical Concepts

### 1. Separate Reference Geometry Tables

**Architecture Change**: Reference data is now stored in dedicated tables, completely isolated from model predictions.

```
Model Predictions (never edited):
- v2_deadwood_geometries (label_source='model_prediction')
- v2_forest_cover_geometries (label_source='model_prediction')

Reference Data (user-curated):
- reference_patch_deadwood_geometries (NEW)
- reference_patch_forest_cover_geometries (NEW)
```

**Benefits**:

- ✅ Model re-runs cannot delete reference data
- ✅ Simpler queries (no `label_source` filtering)
- ✅ Physical separation matches mental model
- ✅ Clearer data ownership

### 2. Base Patch vs Sub-patch Hierarchy

```
Base Patch (20cm)  id=1, patch_index="20_0"
├─ 10cm Patch     id=2, patch_index="20_0_0", parent_tile_id=1
├─ 10cm Patch     id=3, patch_index="20_0_1", parent_tile_id=1
├─ 10cm Patch     id=4, patch_index="20_0_2", parent_tile_id=1
└─ 10cm Patch     id=5, patch_index="20_0_3", parent_tile_id=1
    ├─ 5cm Patch  id=6, patch_index="20_0_3_0", parent_tile_id=5
    ├─ 5cm Patch  id=7, patch_index="20_0_3_1", parent_tile_id=5
    ├─ 5cm Patch  id=8, patch_index="20_0_3_2", parent_tile_id=5
    └─ 5cm Patch  id=9, patch_index="20_0_3_3", parent_tile_id=5
```

**Critical**: Only base patches (20cm) have `reference_*_label_id`. Sub-patches inherit by walking up the parent chain.

### 3. Label Versioning Pattern

```
v2_labels table:
id=100, reference_patch_id=42, version=1, parent_label_id=NULL, is_active=FALSE
id=101, reference_patch_id=42, version=2, parent_label_id=100, is_active=FALSE
id=102, reference_patch_id=42, version=3, parent_label_id=101, is_active=TRUE  ← current

reference_patch_deadwood_geometries table:
label_id=100, patch_id=42, geometry={...}, created_at=...
label_id=100, patch_id=42, geometry={...}, created_at=...
label_id=101, patch_id=42, geometry={...}, created_at=...
label_id=102, patch_id=42, geometry={...}, created_at=...

Revert to v2 → creates:
id=103, reference_patch_id=42, version=4, parent_label_id=101, is_active=TRUE
(clones geometries from label_id=101 into new rows with label_id=103)
```

### 4. Single-Layer Selection Model

**Why Radio Buttons?**

- Only one layer visible at a time prevents visual clutter
- Clear editing intent (user knows which layer they're about to edit)
- Simpler mental model than multi-layer checkboxes
- Keyboard shortcuts (J/K/L) map naturally to radio selection

**Layer Options**:

1. **Deadwood** (`J` key) - Default
2. **Forest Cover** (`K` key)
3. **Ortho Only** (`L` key) - No vectors

**AOI**: Always visible (not selectable)

### 5. Geometry Clipping with Buffer

```typescript
// Patch bbox: [minx, miny, maxx, maxy]
const patchBBox = [100, 200, 300, 400];

// Add 10m buffer to capture polygons slightly outside
const bufferedBBox = [90, 190, 310, 410];

// Clip overlay features to buffered bbox
const clippedGeoms = features
  .filter((f) => intersects(f.getExtent(), bufferedBBox))
  .map((f) => geoJsonFormatter.writeGeometryObject(f.getGeometry()));
```

**Why buffer?** Polygons on patch edges may extend slightly beyond. Buffer ensures we don't lose partial features.

---

## Architecture Decisions (CONFIRMED)

### 1. Reference Data Storage

**Decision**: Separate tables (`reference_patch_*_geometries`)

- NOT stored in `v2_deadwood_geometries` or `v2_forest_cover_geometries`
- Safer: Impossible to corrupt model predictions
- Simpler queries: Direct table access, no filtering needed
- Clear separation: Physical model matches mental model

### 2. Reference Data Rendering

**Decision**: Direct VectorLayer (not MVT)

- Fetch geometries directly from `reference_patch_deadwood_geometries` / `reference_patch_forest_cover_geometries`
- Render as OpenLayers VectorLayer
- Simpler, faster for small patch areas
- No backend MVT generation needed for reference data

### 3. Layer Type Distinction

**Decision**: Known from query context

- Separate queries for deadwood vs forest cover (different tables)
- Tag features with `label_data` property for tracking
- Radio button controls which query runs

### 4. Layer Selection UI

**Decision**: Radio buttons (Deadwood/Forest Cover/Ortho Only)

- Replaces checkbox toggles
- Position: Bottom-left of map (same as old checkboxes)
- Keyboard: J/K/L keys
- Default: Deadwood
- AOI: Always visible (not in radio group)
- Hidden during editing mode

### 5. Editing UI Layout (MODAL DESIGN)

**Decision**: Sidebar ↔ Toolbar exclusive visibility

```
NORMAL MODE:
┌─────────────────────────────────┐
│ Map                    Sidebar  │
│ [Radio: D/F/O]        [X] Close │
│                                  │
│                       [← Nav →] │
│                    [Edit Deadwood]
│ [AOI always visible]            │
└─────────────────────────────────┘

EDITING MODE:
┌─────────────────────────────────┐
│ Map              [Toolbar]      │
│ [Radio HIDDEN]    [Ver History] │
│                  [Draw/Modify/  │
│                   AI/Save/Cancel│
│                   Delete/Merge] │
│ [Sidebar HIDDEN]                │
│ [AOI still visible]             │
└─────────────────────────────────┘
```

**Flow**:

1. User selects layer via radio button (e.g., "Deadwood")
2. User clicks "Edit Deadwood" button (below navigation)
3. Sidebar slides out/hides
4. Editing toolbar appears (top-right, floating)
5. User edits polygons
6. User clicks "Save" in toolbar → toolbar hides, sidebar returns
7. OR user clicks "Cancel" → discard changes, sidebar returns

### 6. Edit Button Behavior

**Decision**: Single dynamic button based on radio selection

- **Button label**: "Edit Deadwood" OR "Edit Forest Cover" (dynamic)
- **Placement**: Below navigation buttons in sidebar
- **State**: Enabled only if a layer is selected (disabled for "Ortho Only")
- **Action**: Immediately enters editing mode for selected layer

### 7. Version History UI

**Decision**: Shown in editing toolbar (not sidebar)

- **Placement**: Top-right, next to toolbar controls
- **Visibility**: Only during editing mode
- **Condition**: Only show if version > 1 (edits have been made)
- **Action**: Opens side panel with version timeline + revert buttons

### 8. Patch Deselection

**Decision**: Explicit control only

- **Method 1**: [X] button in sidebar header
- **Method 2**: `Esc` key
- **Behavior**: Map clicks do NOT deselect (only switch between patches)
- **Result**: Prevents accidental context loss

### 9. Edit at Any Resolution

**Decision**: Can edit from 20cm, 10cm, OR 5cm patches

- Always edits the BASE patch's reference (walks up parent chain)
- Sub-patches inherit parent's reference
- Edit button visible at all resolutions
- Dynamic button label always reflects current radio selection

### 10. Initial Reference Creation

**Decision**: Auto-copy predictions on "Generate Sub-patches"

- First "Generate Sub-patches" click → auto-copy predictions within bbox as v1 reference
- Creates `v2_labels` with `label_source='reference_patch'`
- Stores geometries in `reference_patch_deadwood_geometries` and `reference_patch_forest_cover_geometries`
- Links to patch via `reference_deadwood_label_id` and `reference_forest_cover_label_id`

---

## UI Component Structure

### ReferencePatchEditorView (Main Container)

```typescript
const [editingMode, setEditingMode] = useState<'deadwood' | 'forest_cover' | null>(null);
const [layerSelection, setLayerSelection] = useState<'deadwood' | 'forest_cover' | 'ortho_only'>('deadwood');
const [selectedPatchId, setSelectedPatchId] = useState<number | null>(null);

const editor = usePolygonEditor({ mapRef });
const ai = useAISegmentation({ mapRef, getOrthoLayer, getTargetVectorSource: ... });

// Keyboard shortcuts for layer selection
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (editingMode) return; // Disabled during editing

    switch (e.key.toLowerCase()) {
      case 'j':
        setLayerSelection('deadwood');
        break;
      case 'k':
        setLayerSelection('forest_cover');
        break;
      case 'l':
        setLayerSelection('ortho_only');
        break;
      case 'escape':
        if (selectedPatchId) {
          handleDeselectPatch();
        }
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [editingMode, selectedPatchId]);

return (
  <div className="flex h-full">
    {/* Map */}
    <ReferencePatchMap
      layerSelection={layerSelection}
      showLayerRadio={!editingMode}
      selectedPatchId={selectedPatchId}
      onPatchSelected={handlePatchSelected}
      onMapReady={setMapRef}
      onGetOrthoLayer={setGetOrthoLayer}
      ...
    />

    {/* Layer Radio Buttons (bottom-left, hidden during editing) */}
    {!editingMode && (
      <LayerRadioButtons
        value={layerSelection}
        onChange={setLayerSelection}
        position="bottom-left"
      />
    )}

    {/* Conditional: Sidebar XOR Toolbar */}
    {editingMode ? (
      <EditorToolbar
        position="top-right"
        type={editingMode}
        editor={editor}
        ai={ai}
        onSave={() => handleSaveEdits(editingMode)}
        onCancel={handleCancelEditing}
        showVersionHistory={hasMultipleVersions}
      />
    ) : (
      selectedPatch && (
        <PatchDetailSidebar
          basePatch={basePatch}
          selectedPatch={selectedPatch}
          currentLayer={layerSelection}
          onEditLayer={() => handleStartEditing(layerSelection)}
          onDeselect={handleDeselectPatch}
          editButtonEnabled={layerSelection !== 'ortho_only'}
          ...
        />
      )
    )}
  </div>
);
```

### LayerRadioButtons (NEW Component)

```typescript
interface Props {
  value: 'deadwood' | 'forest_cover' | 'ortho_only';
  onChange: (value: 'deadwood' | 'forest_cover' | 'ortho_only') => void;
  position: 'bottom-left' | 'bottom-right';
}

export default function LayerRadioButtons({ value, onChange, position }: Props) {
  return (
    <div className={`absolute ${position === 'bottom-left' ? 'left-2' : 'right-2'} bottom-2 z-10`}>
      <Card size="small" className="shadow-lg">
        <Radio.Group value={value} onChange={(e) => onChange(e.target.value)} buttonStyle="solid">
          <Space direction="vertical" size="small">
            <Radio.Button value="deadwood">
              Deadwood <span className="text-xs text-gray-400">(J)</span>
            </Radio.Button>
            <Radio.Button value="forest_cover">
              Forest Cover <span className="text-xs text-gray-400">(K)</span>
            </Radio.Button>
            <Radio.Button value="ortho_only">
              Ortho Only <span className="text-xs text-gray-400">(L)</span>
            </Radio.Button>
          </Space>
        </Radio.Group>

        {/* AOI always visible indicator */}
        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          AOI: Always Visible
        </div>
      </Card>
    </div>
  );
}
```

### PatchDetailSidebar (Enhanced)

**New Props**:

```typescript
interface Props {
  // ... existing
  currentLayer: "deadwood" | "forest_cover" | "ortho_only";
  onEditLayer: () => void;
  onDeselect: () => void;
  editButtonEnabled: boolean;
  basePatch: IReferencePatch; // Always the base patch (20cm)
}
```

**UI Layout**:

```tsx
<Card
  title={`Base Patch: ${basePatch.patch_index}`}
  extra={
    <Button type="text" icon={<CloseOutlined />} onClick={onDeselect} size="small" className="hover:bg-gray-100" />
  }
  className="h-full"
>
  {/* Progress Summary */}
  {hasSubPatches && (
    <Space direction="vertical" size="small" className="mb-4 w-full">
      <div className="flex justify-between">
        <span>10cm Patches:</span>
        <span>
          {completed10cm}/{total10cm}
        </span>
      </div>
      <div className="flex justify-between">
        <span>5cm Patches:</span>
        <span>
          {completed5cm}/{total5cm}
        </span>
      </div>
      <Progress percent={overallPercent} />
    </Space>
  )}

  {/* Resolution Tabs */}
  {hasSubPatches && (
    <Tabs activeKey={selectedResolution} onChange={onResolutionChange}>
      <Tabs.TabPane key="20" tab="20cm" />
      <Tabs.TabPane key="10" tab="10cm" />
      <Tabs.TabPane key="5" tab="5cm" />
    </Tabs>
  )}

  {/* Rating Buttons */}
  <Space direction="vertical" className="mb-4 w-full">
    <Radio.Group value={selectedPatch.status} onChange={handleStatusChange}>
      <Radio.Button value="good">Good (Space)</Radio.Button>
      <Radio.Button value="bad">Bad (F)</Radio.Button>
    </Radio.Group>
  </Space>

  {/* Navigation Buttons */}
  <Space className="mb-4 w-full">
    <Button icon={<LeftOutlined />} onClick={handlePrevious} />
    <Button onClick={handleJumpToNextPending} className="flex-1">
      Next Pending
    </Button>
    <Button icon={<RightOutlined />} onClick={handleNext} />
  </Space>

  {/* EDIT BUTTON (NEW) - Dynamic based on radio selection */}
  {hasSubPatches && (
    <Button
      type="primary"
      icon={<EditOutlined />}
      onClick={onEditLayer}
      disabled={!editButtonEnabled}
      block
      size="large"
      className="mb-4"
    >
      Edit {currentLayer === "deadwood" ? "Deadwood" : "Forest Cover"}
    </Button>
  )}

  {/* Delete Button */}
  <Button danger block icon={<DeleteOutlined />} onClick={handleDelete}>
    Delete Patch
  </Button>
</Card>
```

### EditorToolbar (Enhanced)

```typescript
interface Props {
  position: 'top-right' | 'top-left';
  type: 'deadwood' | 'forest_cover';
  editor: ReturnType<typeof usePolygonEditor>;
  ai: ReturnType<typeof useAISegmentation>;
  onSave: () => void;
  onCancel: () => void;
  showVersionHistory: boolean; // Only if version > 1
}

export default function EditorToolbar({
  position,
  type,
  editor,
  ai,
  onSave,
  onCancel,
  showVersionHistory
}: Props) {
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);

  return (
    <>
      {/* Main Toolbar */}
      <div className={`absolute ${position === 'top-right' ? 'right-4' : 'left-4'} top-4 z-20`}>
        <Card
          title={`Editing ${type === 'deadwood' ? 'Deadwood' : 'Forest Cover'}`}
          className="shadow-lg"
          style={{ width: 300 }}
          extra={
            showVersionHistory && (
              <Button
                type="text"
                icon={<HistoryOutlined />}
                onClick={() => setVersionPanelOpen(true)}
                size="small"
              >
                History
              </Button>
            )
          }
        >
          {/* Editor Controls */}
          <Space direction="vertical" size="small" className="w-full">
            <Button
              icon={editor.isDrawing ? <StopOutlined /> : <DrawOutlined />}
              onClick={editor.toggleDraw}
              block
            >
              {editor.isDrawing ? 'Stop Draw' : 'Draw'}
            </Button>

            <Button
              icon={<ScissorOutlined />}
              onClick={editor.cutHoleWithDrawn}
              disabled={!editor.selection || editor.selection.length === 0}
              block
            >
              Cut Hole
            </Button>

            <Button
              icon={<MergeOutlined />}
              onClick={editor.mergeSelected}
              disabled={!editor.selection || editor.selection.length < 2}
              block
            >
              Merge Selected
            </Button>

            <Button
              icon={<RobotOutlined />}
              onClick={ai.isActive ? ai.disable : ai.enable}
              loading={ai.isProcessing}
              block
            >
              {ai.isActive ? 'AI Active' : 'AI Segment'}
            </Button>

            <Button
              icon={<DeleteOutlined />}
              onClick={editor.deleteSelected}
              disabled={!editor.selection || editor.selection.length === 0}
              danger
              block
            >
              Delete Selected
            </Button>

            <Divider style={{ margin: '8px 0' }} />

            {/* Save/Cancel */}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={onSave}
              block
              size="large"
            >
              Save Changes
            </Button>

            <Button onClick={onCancel} block>
              Cancel
            </Button>
          </Space>
        </Card>
      </div>

      {/* Version History Panel */}
      {versionPanelOpen && (
        <VersionHistoryPanel
          patchId={selectedPatch.id}
          labelType={type}
          onClose={() => setVersionPanelOpen(false)}
          onRevert={(versionId) => handleRevertToVersion(versionId)}
        />
      )}
    </>
  );
}
```

---

## Key Functions

### handlePatchSelected

```typescript
function handlePatchSelected(patch: IReferencePatch | null) {
  if (!patch) return; // Clicking elsewhere doesn't deselect

  setSelectedPatchId(patch.id);

  // Reset to default layer
  setLayerSelection("deadwood");

  // Load reference data for this patch
  loadReferenceLayersForPatch(patch);
}
```

### handleDeselectPatch

```typescript
function handleDeselectPatch() {
  setSelectedPatchId(null);
  hideReferenceLayers();

  // Switch back to global predictions
  loadGlobalPredictionLayers();

  message.info("Patch deselected - showing global predictions");
}
```

### handleStartEditing

```typescript
async function handleStartEditing(layerType: "deadwood" | "forest_cover") {
  if (layerType === "ortho_only") return; // Should never happen

  // 1. Find base patch (even if sub-patch selected)
  const basePatch = findBasePatchForSelected(selectedPatch);
  if (!basePatch) return;

  // 2. Fetch reference geometries from separate table
  const tableName =
    layerType === "deadwood" ? "reference_patch_deadwood_geometries" : "reference_patch_forest_cover_geometries";

  let geometries = await fetchReferenceGeometriesFromTable(tableName, basePatch.id, layerType);

  if (geometries.length === 0) {
    // No reference yet → auto-copy from predictions (should only happen on first edit)
    geometries = await extractPredictionsInBBox(
      datasetId,
      layerType,
      [basePatch.bbox_minx, basePatch.bbox_miny, basePatch.bbox_maxx, basePatch.bbox_maxy],
      10, // buffer
    );
  }

  // 3. Load into overlay
  const geoJsonFormatter = new GeoJSON();
  const features = geometries.map((g) => {
    const feature = new Feature(geoJsonFormatter.readGeometry(g));
    feature.set("label_data", layerType);
    feature.set("patch_id", basePatch.id);
    return feature;
  });

  editor.getOverlayLayer()?.getSource()?.addFeatures(features);

  // 4. Activate editing
  editor.startEditing();

  // 5. Enter modal mode
  setEditingMode(layerType);
  hideReferenceLayers();
  hideLayerRadio();

  message.info(`Editing ${layerType === "deadwood" ? "Deadwood" : "Forest Cover"} - Draw, modify, or delete polygons`);
}
```

### handleSaveEdits

```typescript
async function handleSaveEdits(type: "deadwood" | "forest_cover") {
  const basePatch = findBasePatchForSelected(selectedPatch);
  if (!basePatch) return;

  // 1. Get features from overlay
  const features = editor.getOverlayLayer()?.getSource()?.getFeatures() || [];

  // 2. Clip to patch bbox with buffer
  const patchBBox = [basePatch.bbox_minx, basePatch.bbox_miny, basePatch.bbox_maxx, basePatch.bbox_maxy];
  const clippedGeoms = clipFeaturesToBBox(features, patchBBox, 10);

  // 3. Save to separate reference table
  const tableName =
    type === "deadwood" ? "reference_patch_deadwood_geometries" : "reference_patch_forest_cover_geometries";

  await updateReferenceLabel({
    patch_id: basePatch.id,
    dataset_id: datasetId,
    label_data: type,
    geometries: clippedGeoms,
    table: tableName,
  });

  // 4. Clean up and exit editing mode
  editor.stopEditing();
  editor.getOverlayLayer()?.getSource()?.clear();
  setEditingMode(null);

  // 5. Restore UI
  showLayerRadio();
  await loadReferenceLayersForPatch(basePatch);

  message.success(`${type === "deadwood" ? "Deadwood" : "Forest Cover"} reference updated!`);
}
```

### handleCancelEditing

```typescript
function handleCancelEditing() {
  editor.stopEditing();
  editor.getOverlayLayer()?.getSource()?.clear();
  setEditingMode(null);

  // Restore UI
  showLayerRadio();

  // Restore reference layers
  const basePatch = findBasePatchForSelected(selectedPatch);
  if (basePatch) {
    loadReferenceLayersForPatch(basePatch);
  }

  message.info("Editing cancelled - no changes saved");
}
```

### findBasePatchForSelected

```typescript
function findBasePatchForSelected(patch: IReferencePatch | null): IReferencePatch | null {
  if (!patch) return null;

  // If already 20cm base patch
  if (patch.resolution_cm === 20 && !patch.parent_tile_id) {
    return patch;
  }

  // Walk up parent chain
  let current = patch;
  while (current.parent_tile_id) {
    const parent = allPatches.find((p) => p.id === current.parent_tile_id);
    if (!parent) break;
    current = parent;
  }

  return current.resolution_cm === 20 ? current : null;
}
```

---

## Database Schema (Already Applied)

### reference_patches table (renamed from ml_training_tiles)

```sql
-- Already applied in DEV
ALTER TABLE ml_training_tiles RENAME TO reference_patches;
ALTER TABLE reference_patches RENAME COLUMN tile_index TO patch_index;

-- Reference label links
ALTER TABLE reference_patches
  ADD COLUMN reference_deadwood_label_id BIGINT REFERENCES v2_labels(id) ON DELETE SET NULL,
  ADD COLUMN reference_forest_cover_label_id BIGINT REFERENCES v2_labels(id) ON DELETE SET NULL;

CREATE INDEX idx_patches_ref_deadwood ON reference_patches(reference_deadwood_label_id)
  WHERE reference_deadwood_label_id IS NOT NULL;
CREATE INDEX idx_patches_ref_forest ON reference_patches(reference_forest_cover_label_id)
  WHERE reference_forest_cover_label_id IS NOT NULL;
```

### NEW: Separate Reference Geometry Tables

```sql
-- Already applied in DEV
CREATE TABLE reference_patch_deadwood_geometries (
  id BIGSERIAL PRIMARY KEY,
  label_id BIGINT NOT NULL REFERENCES v2_labels(id) ON DELETE CASCADE,
  patch_id BIGINT NOT NULL REFERENCES reference_patches(id) ON DELETE CASCADE,
  geometry JSONB NOT NULL,
  area_m2 DOUBLE PRECISION,
  properties JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reference_patch_forest_cover_geometries (
  id BIGSERIAL PRIMARY KEY,
  label_id BIGINT NOT NULL REFERENCES v2_labels(id) ON DELETE CASCADE,
  patch_id BIGINT NOT NULL REFERENCES reference_patches(id) ON DELETE CASCADE,
  geometry JSONB NOT NULL,
  area_m2 DOUBLE PRECISION,
  properties JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ref_dw_geom_label ON reference_patch_deadwood_geometries(label_id);
CREATE INDEX idx_ref_dw_geom_patch ON reference_patch_deadwood_geometries(patch_id);
CREATE INDEX idx_ref_fc_geom_label ON reference_patch_forest_cover_geometries(label_id);
CREATE INDEX idx_ref_fc_geom_patch ON reference_patch_forest_cover_geometries(patch_id);
```

### v2_labels (versioning fields)

```sql
-- Already applied in DEV
ALTER TABLE v2_labels
  ADD COLUMN reference_patch_id BIGINT REFERENCES reference_patches(id) ON DELETE SET NULL,
  ADD COLUMN version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN parent_label_id BIGINT REFERENCES v2_labels(id) ON DELETE SET NULL,
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;

CREATE INDEX idx_labels_ref_patch ON v2_labels(reference_patch_id) WHERE reference_patch_id IS NOT NULL;
CREATE INDEX idx_labels_version_active ON v2_labels(reference_patch_id, version, is_active);
CREATE INDEX idx_labels_parent ON v2_labels(parent_label_id) WHERE parent_label_id IS NOT NULL;
```

### label_source enum

```sql
-- Already applied in DEV
ALTER TYPE LabelSource ADD VALUE IF NOT EXISTS 'reference_patch';
```

---

## Implementation Checklist

### Phase 1: UI Components ✅ (Completed)

- [x] Refactored all components to use "patch" terminology
- [x] Updated database schema (separate tables)
- [x] Created `reference_patch_*_geometries` tables
- [x] Updated types and hooks

### Phase 2: Layer Radio Buttons (TODO)

- [ ] Create `LayerRadioButtons` component
- [ ] Replace checkbox toggles in `ReferencePatchMap`
- [ ] Add keyboard shortcuts (J/K/L)
- [ ] Make AOI always visible (remove from toggles)
- [ ] Default selection: Deadwood
- [ ] Hide radio buttons during editing mode

### Phase 3: Dynamic Edit Button (TODO)

- [ ] Update `PatchDetailSidebar` props (add `currentLayer`, `onEditLayer`, `editButtonEnabled`)
- [ ] Add single "Edit [Layer]" button below navigation
- [ ] Button label changes based on radio selection
- [ ] Disable button when "Ortho Only" selected
- [ ] Remove old "Edit Deadwood" / "Edit Forest Cover" separate buttons

### Phase 4: Explicit Deselection (TODO)

- [ ] Add [X] close button to sidebar header
- [ ] Add `Esc` key handler for deselection
- [ ] Update map click behavior (clicks don't deselect, only switch)
- [ ] Add `onDeselect` callback to sidebar

### Phase 5: Version History in Toolbar (TODO)

- [ ] Update `EditorToolbar` component
- [ ] Add "History" button next to toolbar title
- [ ] Create `VersionHistoryPanel` component (side panel)
- [ ] Only show if `version > 1`
- [ ] Implement revert functionality

### Phase 6: Separate Table Integration (TODO)

- [ ] Update `fetchReferenceGeometries` to query `reference_patch_*_geometries` tables
- [ ] Update `handleSaveEdits` to save to separate tables
- [ ] Update auto-copy logic on "Generate Sub-patches"
- [ ] Update layer display logic (reference vs prediction switching)

### Phase 7: Testing (TODO)

- [ ] Test radio button selection (J/K/L keys)
- [ ] Test AOI always visible
- [ ] Test dynamic edit button (enabled/disabled)
- [ ] Test explicit deselection (X button, Esc key)
- [ ] Test map clicks don't deselect
- [ ] Test version history in toolbar
- [ ] Test separate table queries
- [ ] Test layer switching (predictions ↔ reference)

---

## Success Criteria

✅ Modal editing UI (sidebar and toolbar mutually exclusive)  
✅ Single-layer selection (radio buttons)  
✅ AOI always visible  
✅ Dynamic edit button based on layer selection  
✅ Explicit deselection (X button / Esc key)  
✅ Edit from any resolution (always edits base patch)  
✅ Auto-copy predictions as v1 reference (to separate tables)  
✅ Version control with revert (shown in toolbar)  
✅ Clean visual flow (no UI clutter)  
✅ No unsaved changes warnings needed (explicit Save/Cancel)  
✅ Protected from model reruns (separate `reference_patch_*_geometries` tables)

---

**Status**: Architecture updated, UI components refactored, database schema applied. Ready for Phase 2-7 implementation! 🚀
