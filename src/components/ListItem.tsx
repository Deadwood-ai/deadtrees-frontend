import { Button, notification, Tooltip, Divider, Tag } from "antd";
import { InfoCircleTwoTone } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useData } from "../hooks/useDataProvider";
import { IDataset } from "../types/dataset";
import { Settings } from "../config";
import countryList from "../utils/countryList";
const ListItme = ({
  item,
  index,
  setHoveredItem,
  hoveredItem,
}: {
  item: IDataset;
  index: any;
  setHoveredItem: ((id: number | null) => void) | undefined;
  hoveredItem: number | null;
}) => {
  const { setFilter, setFilterTag } = useData();
  const navigate = useNavigate();

  const handleMouseEnter = () => {
    // console.log("hoveredItem", hoveredItem);

    setHoveredItem(item.id);
  };

  const handleMouseLeave = () => {
    if (setHoveredItem) {
      setHoveredItem(null);
    }
  };

  const onClickHandler = (item) => {
    // console.log("clicked item", item);
    // if (item.id && item.file_size < 1000000000) {
    navigate(`/dataset/${item.id}`);
    // } else {
    //   notification.info({
    //     message: "Coming Soon",
    //     description: "This dataset is not yet available",
    //   });
    // }
  };

  const onClickFilterHandler = (e, filter, filterTag) => {
    setFilter(filter);
    setFilterTag(filterTag);
    e.stopPropagation();
    console.log(filter);
  };

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
            <Tooltip title={item.admin_level_3}>
              <Button
                type="text"
                size="small"
                className=" max-content m-0 ml-1 p-0 font-semibold"
                onClick={(e) => onClickFilterHandler(e, item.admin_level_3, "admin_level_3")}
              >
                {item.admin_level_3 || item.admin_level_2
                  ? (item.admin_level_3 || item.admin_level_2).slice(0, 15) +
                    ((item.admin_level_3 || item.admin_level_2).length > 15 ? "..." : "")
                  : ""}
              </Button>
            </Tooltip>
            {(item.admin_level_3 || item.admin_level_2) && ","}
            <Button
              type="text"
              size="small"
              className="max-content m-0 ml-1 p-0 font-semibold"
              onClick={(e) => onClickFilterHandler(e, item.admin_level_1, "admin_level_1")}
            >
              {countryList[item.admin_level_1 as keyof typeof countryList]}
            </Button>
            {/* <p className="m-0 flex-1 font-semibold">
            {item.admin_level_3}, {item.admin_level_1}
          </p> */}
            {/* {(item.wms_source === null || item.file_size > 1000000000) && (
            <div>
              <Tooltip title="This dataset is not yet available">
                <InfoCircleTwoTone />
              </Tooltip>
            </div>
          )} */}
          </div>
          <div className="pt-0.5 text-xs">
            {new Date(
              item.aquisition_year,
              item.aquisition_month ? item.aquisition_month - 1 : 0,
              item.aquisition_day ?? 1,
            ).toLocaleDateString("en-US", {
              year: "numeric",
              ...(item.aquisition_month && { month: "numeric" }),
              ...(item.aquisition_day && { day: "numeric" }),
            })}
          </div>
        </div>
        <div className="flex space-x-1">
          <div className="flex-1">
            <Tooltip title={item.authors}>
              <Button
                // type="text"
                size="small"
                className="truncate font-medium"
                onClick={(e) => onClickFilterHandler(e, item.authors, "authors_image")}
              >
                {item.authors && item.authors[0].slice(0, 18) + (item.authors[0].length > 18 ? "..." : "")}
              </Button>
            </Tooltip>
          </div>

          <Tag onClick={(e) => onClickFilterHandler(e, item.platform, "platform")}>{item.platform}</Tag>
        </div>
      </div>
    </div>
  );
};

export default ListItme;
