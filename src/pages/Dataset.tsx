import { useMemo, useState, useEffect } from "react";
import { Button, Col, Row, Tag, Input } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";

import DataList from "../components/DataList";
import DatasetMapOL from "../components/DatasetMap/DatasetMap";
import { CloseOutlined } from "@ant-design/icons";
import { useFilteredDatasets } from "../hooks/useFilteredDatasets";
import { useDatasets } from "../hooks/useDatasets";

type SortDirection = "asc" | "desc";
type FilterTag = "platform" | "license" | "authors_image" | "admin_level_1" | "admin_level_3";

export default function Dataset() {
  const { data: allData } = useDatasets();
  const { filteredData, setFilter, setFilterTag, filter } = useFilteredDatasets(allData);

  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [visibleFeatures, setVisibleFeatures] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const handleFilterClick = (filterValue: string, filterType: FilterTag) => {
    setFilter(filterValue);
    setFilterTag(filterType);
  };

  const processedData = useMemo(() => {
    if (!filteredData) return null;

    const filtered = filteredData.filter((d) => {
      // Base condition for valid datasets
      const baseCondition =
        d.is_upload_done && d.is_cog_done && d.is_ortho_done && d.is_metadata_done && !d.has_error && d.admin_level_1;

      if (!baseCondition) return false;

      // If no search value, return true for the base condition
      if (!searchValue.trim()) return true;

      const searchTerms = searchValue.toLowerCase().split(/\s+/).filter(Boolean);

      // Search in authors
      const authorMatch =
        d.authors?.some((author) => searchTerms.every((term) => author.toLowerCase().includes(term))) || false;

      // Search in location
      const locationWords = `${d.admin_level_3 || ""}, ${d.admin_level_1 || ""}`
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean);

      const locationMatch = searchTerms.every((term) => locationWords.some((word) => word.includes(term)));

      return authorMatch || locationMatch;
    });

    // Sort by date
    return filtered.sort((a, b) => {
      const dateA = new Date(
        parseInt(a.aquisition_year),
        a.aquisition_month ? parseInt(a.aquisition_month) - 1 : 0,
        a.aquisition_day ? parseInt(a.aquisition_day) : 1,
      );
      const dateB = new Date(
        parseInt(b.aquisition_year),
        b.aquisition_month ? parseInt(b.aquisition_month) - 1 : 0,
        b.aquisition_day ? parseInt(b.aquisition_day) : 1,
      );

      return sortDirection === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });
  }, [filteredData, searchValue, sortDirection]);

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
              placeholder="Search by Authors or Location"
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1"
              allowClear
              value={searchInput}
            />
            <div className="pl-4">
              <Button
                icon={sortDirection === "asc" ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                onClick={toggleSort}
                type="primary"
                title={`Sort by date ${sortDirection === "asc" ? "oldest first" : "newest first"}`}
              />
            </div>
          </div>
        </div>

        {processedData ? (
          <DataList
            data={processedData}
            hoveredItem={hoveredItem}
            setHoveredItem={setHoveredItem}
            visibleFeatures={visibleFeatures}
            onFilterClick={handleFilterClick}
          />
        ) : (
          <div>Loading...</div>
        )}
      </Col>
      <Col className="flex-1 pt-2">
        {processedData && processedData.length > 0 ? (
          <DatasetMapOL
            data={processedData}
            hoveredItem={hoveredItem}
            setHoveredItem={setHoveredItem}
            setVisibleFeatures={setVisibleFeatures}
          />
        ) : (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
            <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
          </div>
        )}
      </Col>
    </Row>
  );
}
