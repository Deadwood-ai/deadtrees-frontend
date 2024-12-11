import { Button, Carousel, Tooltip, Tag } from "antd";
import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useData } from "../../hooks/useDataProvider";
import { Settings } from "../../config";

const Stat = ({ title, value, unit }: { title: string; value: string; unit: string }) => {
  return (
    <div className="m-auto mx-8 w-full rounded-xl px-6">
      <div className="flex items-baseline justify-center">
        <p className="m-0 text-3xl font-medium text-blue-600">{value}</p>
        <p className="m-0 pl-1 text-lg font-medium  text-blue-500">{unit}</p>
      </div>
      <p className="m-0 p-3 text-center text-sm font-medium uppercase">{title}</p>
    </div>
  );
};

const Stats = () => {
  return (
    <div className="flex flex-col justify-center py-4 align-middle md:mt-0">
      <div className="text-center"></div>
      <div className="grid grid-cols-2 pt-8 md:flex md:justify-around">
        <Stat title="Orthophotos" value="1000+" unit="" />
        <Stat title="Labeled Polygons" value="40k" unit="" />
        <Stat title="Countries" value="63" unit="" />
        <Stat title="Institutions" value="43" unit="" />
      </div>
    </div>
  );
};

const DataGallery = () => {
  const { data } = useData();
  const carouselRef = useRef<any>(null);
  const navigate = useNavigate();

  const sortedUniqueData = useMemo(() => {
    if (!data) return [];

    const sorted = [...data].sort((a, b) => b.id + a.id);

    const authorMap = new Map();
    return sorted.filter((item) => {
      if (!item.authors) return false;
      if (!authorMap.has(item.authors)) {
        authorMap.set(item.authors, true);
        return true;
      }
      return false;
    });
  }, [data]);

  const onClickHandler = (id: number) => {
    navigate(`/dataset/${id}`);
  };

  const next = () => carouselRef.current?.next();
  const previous = () => carouselRef.current?.prev();

  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  return (
    <div className="hidden md:block">
      <div className="m-auto w-full rounded-xl bg-gradient-to-t from-white to-purple-50 p-8 md:mt-36 md:w-full">
        <p className="text-center text-lg font-semibold text-blue-600">EXPLORE OUR DATABASE</p>
        <p className="m-0 text-center text-4xl font-semibold md:text-5xl">Global Tree Mortality Atlas</p>
        <p className="m-auto max-w-4xl pt-8 text-left text-lg text-gray-500">
          Browse our growing collection of aerial imagery datasets showing tree mortality patterns. Each dataset
          includes high-resolution orthophotos and optional polygon annotations of dead trees, contributed by
          researchers worldwide.
        </p>
        <div className="relative px-4 pt-8">
          <Button
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 bg-white/80"
            icon={<LeftOutlined />}
            onClick={previous}
            shape="circle"
          />
          <Button
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 bg-white/80"
            icon={<RightOutlined />}
            onClick={next}
            shape="circle"
          />

          <div className="mx-8">
            <Carousel ref={carouselRef} {...settings}>
              {sortedUniqueData.map((item) => (
                <div key={item.id} className="px-2 py-4">
                  <div
                    className="cursor-pointer rounded-lg bg-white shadow-md transition-shadow duration-200 hover:shadow-lg"
                    onClick={() => onClickHandler(item.id)}
                  >
                    <img
                      src={item.thumbnail_path ? Settings.THUMBNAIL_URL + item.thumbnail_path : "/assets/tree-icon.png"}
                      className="h-48 w-full rounded-t-lg object-cover"
                      loading="lazy"
                      alt={`Dataset ${item.id}`}
                    />
                    <div className="p-4">
                      <div className="mb-2 flex items-baseline justify-between">
                        <Tooltip title={item.admin_level_3}>
                          <span className="max-w-[70%] truncate font-semibold">
                            {item.admin_level_3 &&
                              item.admin_level_3.slice(0, 15) + (item.admin_level_3.length > 15 ? "..." : "")}
                          </span>
                        </Tooltip>
                        <span className="text-xs text-gray-500">
                          {new Date(
                            item.aquisition_year,
                            item.aquisition_month,
                            item.aquisition_day,
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            ...(item.aquisition_month && { month: "numeric" }),
                            ...(item.aquisition_day && { day: "numeric" }),
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Tooltip title={item.authors}>
                          <span className="max-w-[70%] truncate text-sm text-gray-600">
                            {item.authors && item.authors.slice(0, 18) + (item.authors.length > 18 ? "..." : "")}
                          </span>
                        </Tooltip>
                        <Tag>{item.platform}</Tag>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Carousel>
          </div>
          <Stats />
        </div>
        <div className="flex justify-center pt-8">
          <Button type="primary" size="large" onClick={() => navigate("/dataset")}>
            Explore all datasets
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataGallery;
