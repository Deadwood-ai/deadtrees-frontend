import { useMemo, useState, useEffect } from "react";
import { Button, Col, Row, Tag, Input, Spin, Tooltip, Checkbox } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, FilterOutlined } from "@ant-design/icons";

import DataList from "../components/DataList";
import DatasetMapOL from "../components/DatasetMap/DatasetMap";
import { CloseOutlined } from "@ant-design/icons";
import { useFilteredDatasets } from "../hooks/useFilteredDatasets";
import { usePublicDatasets } from "../hooks/useDatasets";
import FilterModal, { AdvancedFilters } from "../components/FilterModal";
import { useDatasetFilter } from "../hooks/useDatasetFilterProvider";

type SortDirection = "asc" | "desc";
type FilterTag = "platform" | "license" | "authors_image" | "admin_level_1" | "admin_level_3";

export default function Dataset() {
  const { data: allData } = usePublicDatasets();
  const { filteredData } = useFilteredDatasets(allData);

  // Get filter state from context
  const {
    filter,
    setFilter,
    filterTag,
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
  };

  const handleFilterButtonClick = () => {
    setIsFilterModalVisible(true);
  };

  const handleApplyFilters = (newFilters: AdvancedFilters) => {
    setAdvancedFilters(newFilters);
  };

  const processedData = useMemo(() => {
    if (!filteredData) return null;

    const filtered = filteredData.filter((d) => {
      // Base condition for valid datasets
      const baseCondition =
        d.is_upload_done &&
        d.is_cog_done &&
        d.is_ortho_done &&
        d.is_metadata_done &&
        d.is_thumbnail_done &&
        !d.has_error &&
        d.admin_level_1;

      if (!baseCondition) return false;

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
    <Row
      className="bg-slate-50"
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Col className="flex h-full w-96 flex-col px-2 pt-2 align-middle">
        {filter ? (
          <div className="flex justify-between pb-2">
            <div className="flex items-center">
              <h4 className="p m-0">Filtered by: </h4>
              {
                <Tag className="m-0 ml-1" color="blue">
                  <span className="text-sm font-medium">
                    {filterDisplay.slice(0, 10) + (filterDisplay.length > 10 ? "..." : "")}
                  </span>
                  <Button
                    className=" ml-2 border-none bg-transparent"
                    size="small"
                    shape="circle"
                    onClick={() => {
                      setFilter("");
                      setFilterTag("platform");
                    }}
                    icon={<CloseOutlined />}
                  />
                </Tag>
              }
            </div>
            <div className="flex items-center">
              <h4 className="m-0 pr-2">Images: </h4>
              <Tag>
                <span>{processedData?.length}</span>
              </Tag>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end pb-2">
            <h4 className="m-0 pr-2">Images: </h4>
            <Tag>
              <span>{processedData?.length}</span>
            </Tag>
          </div>
        )}

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
      </Col>
      <Col className="flex-1 pt-2">
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
          />
        )}
      </Col>

      {/* Filter Modal */}
      <FilterModal
        isVisible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={advancedFilters}
      />
    </Row>
  );
}
