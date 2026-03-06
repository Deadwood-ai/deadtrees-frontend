import { useMemo, useState, useEffect } from "react";
import { Button, Tag, Input, Spin, Tooltip, Checkbox } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, FilterOutlined } from "@ant-design/icons";

import DataList from "../components/DataList";
import DatasetMapOL, { type DatasetMapColorMode } from "../components/DatasetMap/DatasetMap";
import DatasetMapColorControl from "../components/DatasetMap/DatasetMapColorControl";
import { CloseOutlined, UploadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useFilteredDatasets } from "../hooks/useFilteredDatasets";
import { usePublicDatasets } from "../hooks/useDatasets";
import FilterModal, { AdvancedFilters } from "../components/FilterModal";
import { useDatasetFilter } from "../hooks/useDatasetFilterProvider";
import { isDatasetViewable } from "../utils/datasetVisibility";

type FilterTag = "platform" | "license" | "authors_image" | "admin_level_1" | "admin_level_3" | "biome";

export default function Dataset() {
  const navigate = useNavigate();
  const { data: allData } = usePublicDatasets();
  const { filteredData } = useFilteredDatasets(allData);

  // Get filter state from context
  const {
    filter,
    setFilter,
    setFilterTag,
    advancedFilters,
    setAdvancedFilters,
    searchInput,
    setSearchInput,
    sortDirection,
    setSortDirection,
    filterByViewport,
    setFilterByViewport,
  } = useDatasetFilter();

  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [visibleFeatures, setVisibleFeatures] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const colorMode: DatasetMapColorMode = "year";
  // Incremented on explicit filter actions to trigger map zoom
  const [filterZoomTrigger, setFilterZoomTrigger] = useState(0);

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchValue(searchInput.toLowerCase());
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  const toggleSort = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  const handleFilterClick = (filterValue: string, filterType: FilterTag) => {
    setFilter(filterValue);
    setFilterTag(filterType);
    setFilterZoomTrigger((n) => n + 1);
  };

  const handleFilterButtonClick = () => {
    setIsFilterModalVisible(true);
  };

  const handleApplyFilters = (newFilters: AdvancedFilters) => {
    setAdvancedFilters(newFilters);
    setFilterZoomTrigger((n) => n + 1);
  };

  const processedData = useMemo(() => {
    if (!filteredData) return null;

    const filtered = filteredData.filter((d) => {
      // Use centralized visibility check
      if (!isDatasetViewable(d)) return false;

      // If no search value, return true for the base condition
      if (!searchValue.trim()) return true;

      const searchTerms = searchValue.toLowerCase().split(/\s+/).filter(Boolean);

      // Search in authors
      const authorMatch =
        d.authors?.some((author) => searchTerms.every((term) => author.toLowerCase().includes(term))) || false;

      // Search in location - now including admin_level_2
      const locationWords = `${d.admin_level_3 || ""}, ${d.admin_level_2 || ""}, ${d.admin_level_1 || ""}`
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean);

      const locationMatch = searchTerms.every((term) => locationWords.some((word) => word.includes(term)));

      return authorMatch || locationMatch;
    });

    // Sort by ID instead of date (ID represents order of addition to database)
    return filtered.sort((a, b) => {
      return sortDirection === "asc" ? a.id - b.id : b.id - a.id;
    });
  }, [filteredData, searchValue, sortDirection]);

  // Reset visibleFeatures when data changes
  useEffect(() => {
    if (processedData?.length && processedData.length > 0) {
      // When data changes, start with all features visible
      setVisibleFeatures(processedData.map((item) => item.id.toString()));
    }
  }, [processedData]);

  const filterDisplay = typeof filter === "string" ? filter : String(filter);

  return (
    <div className="relative h-full w-full bg-slate-50">
      {/* Floating Sidebar */}
      <div className="absolute left-4 top-32 bottom-6 z-10 flex w-[380px] flex-col rounded-2xl border border-gray-200/60 bg-white/95 px-4 pb-4 pt-4 shadow-xl backdrop-blur-sm pointer-events-auto">
        <div className="flex items-start justify-between pb-3">
          <div className="flex flex-col">
            <div className="flex items-center">
              <h4 className="m-0 pr-2 font-medium text-gray-600">Images: </h4>
              <Tag className="m-0 font-semibold text-gray-700 bg-gray-100 border-gray-200">
                <span>{processedData?.length}</span>
              </Tag>
            </div>
            {filter && (
              <div className="flex items-center mt-2">
                <span className="text-xs text-gray-500 mr-2">Filtered by:</span>
                <Tag className="m-0 flex items-center gap-1" color="blue">
                  <span className="text-xs font-medium">
                    {filterDisplay.slice(0, 15) + (filterDisplay.length > 15 ? "..." : "")}
                  </span>
                  <Button
                    className="border-none bg-transparent h-auto p-0 ml-1 flex items-center justify-center text-blue-500 hover:text-blue-700"
                    size="small"
                    onClick={() => {
                      setFilter("");
                      setFilterTag("platform");
                    }}
                    icon={<CloseOutlined className="text-[10px]" />}
                  />
                </Tag>
              </div>
            )}
          </div>
          <Button 
            type="primary" 
            icon={<UploadOutlined />} 
            onClick={() => navigate("/profile")}
            className="shadow-sm font-medium"
          >
            Upload Data
          </Button>
        </div>

        <div className="flex flex-col gap-2 pb-4">
          <div className="flex">
            <Input
              placeholder="Search by Authors or Location (Region, Province, City)"
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1"
              allowClear
              value={searchInput}
            />
            <div className="space-x-2 pl-4">
              <Tooltip title="Open advanced filtering options">
                <Button icon={<FilterOutlined />} onClick={handleFilterButtonClick} />
              </Tooltip>
              <Tooltip title={`Sort by addition order ${sortDirection === "asc" ? "oldest first" : "newest first"}`}>
                <Button
                  icon={sortDirection === "asc" ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                  onClick={toggleSort}
                />
              </Tooltip>
            </div>
          </div>
          <div className="ml-1 mt-0">
            <Checkbox checked={filterByViewport} onChange={(e) => setFilterByViewport(e.target.checked)}>
              Filter list by map view
            </Checkbox>
          </div>
        </div>

        {processedData ? (
          <DataList
            data={processedData}
            hoveredItem={hoveredItem}
            setHoveredItem={setHoveredItem}
            visibleFeatures={visibleFeatures}
            onFilterClick={handleFilterClick}
            searchValue={searchValue}
            filterByViewport={filterByViewport}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Spin size="large" tip="Loading data..." />
          </div>
        )}
      </div>

      {/* Full Map */}
      <div className="absolute inset-0 z-0">
        <div className="absolute right-4 top-32 z-10">
          <DatasetMapColorControl colorMode={colorMode} />
        </div>
        {!processedData ? (
          <div className="flex h-full items-center justify-center">
            <Spin size="large" tip="Loading map..." />
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg bg-white">
            <div className="text-lg font-medium text-gray-500">No results found</div>
            <div className="text-sm text-gray-400">Try adjusting your filters or search criteria</div>
          </div>
        ) : (
          <DatasetMapOL
            data={processedData}
            hoveredItem={hoveredItem}
            setHoveredItem={setHoveredItem}
            setVisibleFeatures={setVisibleFeatures}
            filterZoomTrigger={filterZoomTrigger}
            colorMode={colorMode}
          />
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal
        isVisible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={advancedFilters}
      />
    </div>
  );
}
