import { Button, notification, Tooltip } from "antd";
import { InfoCircleTwoTone } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useData } from "../state/DataProvider";
import { IDataset } from "../types/dataset";
import getThumbnailURL from "../utils/getThumbnails";

const ListItme = ({ item, index }: { item: IDataset; index: any }) => {
  const { setFilter, setFilterTag } = useData();
  const navigate = useNavigate();

  const onClickHandler = (item) => {
    console.log("clicked item", item);
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
      className="flex rounded-md bg-white p-3 transition duration-150 ease-in-out hover:bg-gray-200"
      onClick={() => onClickHandler(item)}
    >
      <img
        src={item.gadm_NAME_0 ? getThumbnailURL(item.file_name) : "/assets/tree-icon.png"}
        className="m-0 h-16 rounded-lg"
        loading="lazy"
      />
      <div className="flex flex-1 flex-col justify-between pl-3">
        <div className="flex items-baseline">
          <p className="m-0 flex-1 font-semibold">
            {item.gadm_NAME_3 && `${item.gadm_NAME_3}, `}
            {item.gadm_NAME_0}
          </p>
          {/* {(item.wms_source === null || item.file_size > 1000000000) && (
            <div>
              <Tooltip title="This dataset is not yet available">
                <InfoCircleTwoTone />
              </Tooltip>
            </div>
          )} */}
        </div>
        <div className="flex space-x-1">
          <div className="flex-1">
            <Tooltip title={item.authors}>
              <Button
                type="default"
                size="small"
                onClick={(e) => onClickFilterHandler(e, item.authors, "authors_image")}
              >
                {item.authors && item.authors.slice(0, 18) + (item.authors.length > 18 ? "..." : "")}
              </Button>
            </Tooltip>
          </div>
          <Button
            className="max-content"
            type="default"
            size="small"
            onClick={(e) => onClickFilterHandler(e, item.platform, "platform")}
          >
            {item.platform}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ListItme;
