import { Button, Tooltip, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { IDataset } from "../types/dataset";
import { Settings } from "../config";
import countryList from "../utils/countryList";
import { useDatasetDetailsMap } from "../hooks/useDatasetDetailsMapProvider";

interface ListItemProps {
  item: IDataset;
  index: number;
  setHoveredItem: ((id: number | null) => void) | undefined;
  hoveredItem: number | null;
  onFilterClick: (
    filterValue: string,
    filterType: "platform" | "license" | "authors_image" | "admin_level_1" | "admin_level_3",
  ) => void;
}

const ListItem = ({ item, index, setHoveredItem, hoveredItem, onFilterClick }: ListItemProps) => {
  const navigate = useNavigate();
  const { setNavigationSource } = useDatasetDetailsMap();

  const handleMouseEnter = () => {
    if (setHoveredItem) {
      setHoveredItem(item.id);
    }
  };

  const handleMouseLeave = () => {
    if (setHoveredItem) {
      setHoveredItem(null);
    }
  };

  const onClickHandler = (item: IDataset) => {
    setNavigationSource("dataset");
    navigate(`/dataset/${item.id}`);
  };

  const onClickFilterHandler = (
    e: React.MouseEvent,
    filter: string,
    filterType: "platform" | "license" | "authors_image" | "admin_level_1" | "admin_level_3",
  ) => {
    onFilterClick(filter, filterType);
    e.stopPropagation();
  };

  const adminLevel3 = item.admin_level_3 || item.admin_level_2 || "";
  const adminLevel1 = item.admin_level_1 || "";
  const firstAuthor = item.authors?.[0] || "";

  return (
    <div
      key={index}
      className={`flex rounded-md p-2 transition duration-150 ease-in-out ${
        hoveredItem === item.id ? "bg-gray-200" : "bg-white hover:bg-gray-100"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onClickHandler(item)}
    >
      <div className="relative h-16 w-16 overflow-hidden rounded-lg">
        <img
          src={item.thumbnail_path ? Settings.THUMBNAIL_URL + item.thumbnail_path : "/assets/tree-icon.png"}
          className="m-0 h-full w-full scale-150 object-cover transition-transform hover:z-10"
          loading="lazy"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between pl-3">
        <div className="flex justify-between">
          <div className="flex items-baseline">
            <Tooltip title={adminLevel3}>
              <Button
                type="text"
                size="small"
                className=" max-content m-0 ml-1 p-0 font-semibold"
                onClick={(e) => onClickFilterHandler(e, adminLevel3, "admin_level_3")}
              >
                {adminLevel3.slice(0, 15) + (adminLevel3.length > 15 ? "..." : "")}
              </Button>
            </Tooltip>
            {adminLevel3 && ","}
            <Tooltip title={adminLevel1}>
              <Button
                type="text"
                size="small"
                className="max-content m-0 ml-1 p-0 font-semibold"
                onClick={(e) => onClickFilterHandler(e, adminLevel1, "admin_level_1")}
              >
                {countryList[adminLevel1 as keyof typeof countryList]}
              </Button>
            </Tooltip>
          </div>
          <div className="pt-0.5 text-xs">
            {new Date(
              parseInt(item.aquisition_year),
              item.aquisition_month ? parseInt(item.aquisition_month) - 1 : 0,
              item.aquisition_day ? parseInt(item.aquisition_day) : 1,
            ).toLocaleDateString("en-GB", {
              year: "numeric",
              ...(item.aquisition_month && { month: "numeric" }),
              ...(item.aquisition_day && { day: "numeric" }),
            })}
          </div>
        </div>
        <div className="flex space-x-1">
          <div className="flex-1">
            <Tooltip title={item.authors?.join(", ")}>
              <Button
                size="small"
                className="truncate font-medium"
                onClick={(e) => onClickFilterHandler(e, firstAuthor, "authors_image")}
              >
                {firstAuthor
                  ? firstAuthor.slice(0, 18) +
                    (firstAuthor.length > 18 ? "..." : "") +
                    (item.authors && item.authors.length > 1 ? ` +${item.authors.length - 1}` : "")
                  : ""}
              </Button>
            </Tooltip>
          </div>

          <Button size="small" onClick={(e) => onClickFilterHandler(e, item.platform, "platform")}>
            {item.platform}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ListItem;
