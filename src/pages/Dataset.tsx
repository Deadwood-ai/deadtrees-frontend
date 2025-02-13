import { useMemo, useState } from "react";
import { Button, Col, Row, Tag, Input, Segmented } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";

import { useData } from "../hooks/useDataProvider";
import DataList from "../components/DataList";
import DatasetMapOL from "../components/DatasetMap/DatasetMap";
import { CloseOutlined } from "@ant-design/icons";

type SearchField = "authors" | "location";
type SortDirection = "asc" | "desc";

export default function Dataset() {
  const { data, filter, setFilter } = useData();
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [visibleFeatures, setVisibleFeatures] = useState<string[]>([]);
  const [searchField, setSearchField] = useState<SearchField>("authors");
  const [searchValue, setSearchValue] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  console.log("data", data);

  const handleSearch = (value: string) => {
    setSearchValue(value.toLowerCase());
    console.log("searchValue", searchValue);
  };

  const toggleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const processedData = useMemo(() => {
    if (!data) return null;

    const filtered = data.filter((d) => {
      const baseCondition = d.status === "processed" && d.admin_level_1;

      if (!searchValue) return baseCondition;

      let searchMatch = false;
      switch (searchField) {
        case "authors": {
          if (!searchValue.trim()) {
            searchMatch = true;
            break;
          }
          const searchTerms = searchValue.toLowerCase().split(/\s+/).filter(Boolean);
          const authorWords = (d.authors?.toLowerCase() || "").split(/[\s,]+/).filter(Boolean);

          searchMatch = searchTerms.every((searchTerm) => authorWords.some((word) => word.includes(searchTerm)));
          break;
        }
        case "location": {
          if (!searchValue.trim()) {
            searchMatch = true;
            break;
          }
          const searchTerms = searchValue.toLowerCase().split(/\s+/).filter(Boolean);
          const locationWords = `${d.admin_level_3 || ""}, ${d.admin_level_1 || ""}`
            .toLowerCase()
            .split(/[\s,]+/)
            .filter(Boolean);

          searchMatch = searchTerms.every((searchTerm) => locationWords.some((word) => word.includes(searchTerm)));
          break;
        }
      }
      return baseCondition && searchMatch;
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
  }, [data, searchField, searchValue, sortDirection]);

  return (
    <Row
      className="bg-slate-50"
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Col className="flex h-full w-96 flex-col px-2 align-middle">
        {filter ? (
          <div className="flex justify-between pb-2">
            <div className="flex items-center">
              <h4 className="m-0">Filtered by: </h4>
              {
                <Tag className="m-0 ml-1" color="blue">
                  <span className="text-sm font-medium">{filter.slice(0, 10) + (filter.length > 10 ? "..." : "")}</span>
                  <Button
                    className=" ml-2 border-none bg-transparent"
                    size="small"
                    shape="circle"
                    onClick={() => setFilter("")}
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
          <Segmented
            value={searchField}
            onChange={(value) => setSearchField(value as SearchField)}
            options={[
              { label: "Authors", value: "authors" },
              { label: "Location (City, State)", value: "location" },
            ]}
            className="pb-2"
            block
          />

          <div className="flex">
            <Input.Search
              placeholder={searchField === "location" ? "Search by City or State" : "Search by Authors"}
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1"
              allowClear
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
