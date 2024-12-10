import { Input, Button, Collapse, notification, Alert, Timeline, Carousel } from "antd";
import { useState, useMemo, useRef } from "react";
import Slider from "react-slick";
import { useNavigate } from "react-router-dom";
import { PlayCircleFilled, LeftOutlined, RightOutlined } from "@ant-design/icons";
import ReactPlayer from 'react-player';

import { supabase } from "../hooks/useSupabase";
import { useData } from "../hooks/useDataProvider";
import { Tooltip, Tag } from "antd";
import { Settings } from "../config";
import countryList from "../utils/countryList";

const Hero = () => {
  const [email, setEmail] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);

  const emailCheck = (email: string) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const addSubscriber = async () => {
    if (!emailCheck(email)) {
      notification.error({
        message: "Invalid email",
        description: "Please enter a valid email address.",
        placement: "topRight",
      });
      return;
    }
    const { data, error } = await supabase.from("newsletter").insert([{ email }]);
    if (error) {
      notification.error({
        message: "Error",
        description: "An error occurred while adding the subscriber.",
        placement: "topRight",
      });
      console.error("Error adding subscriber:", error);
    } else {
      notification.success({
        message: "Thank you!",
        description: "You will be notified as soon as the service is up and running.",
        placement: "topRight",
      });
      console.log("Subscriber added:", email);
    }
  };

  return (
    <div className="flex flex-col items-center pb-12">
      <div>
        <div className="md:hidden">
          <Alert
            message="Mobile version is limited"
            description="Please use a desktop browser for full functionality. Features like the interactive map, data visualization, and dataset uploads are optimized for desktop devices."
            type="info"
            showIcon
            closable
          />
        </div>
        <div className="flex justify-center pt-12 md:pt-24">
          <Tag className="text-xl mb-4" color="warning">BETA</Tag>
        </div>
        <h1 className="m-0 bg-gradient-to-r from-blue-700 to-purple-500 bg-clip-text pb-10 text-center text-5xl font-bold text-transparent md:text-7xl">
          deadtrees.earth
        </h1>
        <p className="m-auto text-center text-xl text-gray-500 md:max-w-xl">
          An open database for accessing, contributing, analyzing, and visualizing remote sensing-based tree mortality data.
        </p>
        <div className="pt-8">
          <p className="pb-1 text-center text-md text-gray-500 max-w-xl">
            Stay informed about new features and the latest developments.
          </p>
          <div className="flex flex-col md:flex-row w-full justify-center gap-2 pt-0">
            <Input
              size="large"
              className="w-full md:w-80"
              placeholder="Enter email..."
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              onClick={addSubscriber}
              className="w-full md:w-auto"
              type="primary"
              size="large"
            >
              Get notified
            </Button>
          </div>
        </div>
      </div>
      {/* Video Section */}
      <div className="relative mx-auto mt-12 md:mt-32 aspect-video w-full max-w-5xl overflow-hidden bg-gray-100 shadow-2xl rounded-2xl">
        {!isPlaying && (
          <PlayCircleFilled
            onClick={(e) => {
              setIsPlaying(true);
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1 text-blue-600 hover:text-blue-900 transition-colors text-6xl z-50 pointer-events-none"
          />
        )}
        <ReactPlayer
          url="https://ijuphmnaebfdzsfrnsrn.supabase.co/storage/v1/object/public/video/deadtrees_V2_final.mp4"
          width="100%"
          height="100%"
          controls={true}
          playsinline
          loop={true}
          light="https://ijuphmnaebfdzsfrnsrn.supabase.co/storage/v1/object/public/video/image.png?t=2024-12-10T11%3A01%3A12.395Z" // Add this line with your thumbnail image path
          config={{
            file: {
              attributes: {

                controlsList: 'nodownload',
              },
            },
          }}
          playing={isPlaying}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>
    </div>
  );
};






const LogoBanner = ({ logoPath, className = "" }: { logoPath: string; className?: string }) => {
  return (
    <div className={`m-auto w-full ${className}`}>
      <div className="flex items-baseline justify-center">
        <div className="w-36 flex items-center justify-center">
          <img src={logoPath} alt="deadtrees.earth" className="w-full" />
        </div>
      </div>
    </div>
  );
};

const LogoBannerBand = () => {
  return (
    <div className="pt-12">
      <p className="mb-8 text-md text-center text-gray-600">Supported by</p>
      <div className="grid grid-cols-2 gap-4 md:flex md:justify-around w-full">
        <LogoBanner logoPath="assets/logos/bml.png" />
        <LogoBanner logoPath="assets/logos/esa.jpg" />
        <LogoBanner logoPath="assets/logos/dfg.jpeg" />
        <LogoBanner logoPath="assets/logos/uni-freiburg.png" />
        <LogoBanner logoPath="assets/logos/NFDI4Earth_logo.jpg" className="md:block hidden" />
      </div>
    </div>
  );
}





const Stat = ({ title, value, unit }: { title: string; value: string; unit: string }) => {
  return (
    <div className="m-auto rounded-xl px-6 w-full mx-8">
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
      <div className="text-center">
        {/* <p className="text-xl font-semibold text-blue-600">CURRENT STATS</p> */}
      </div>
      <div className="grid grid-cols-2 pt-8 md:flex md:justify-around">
        {/* <Stat title="covered" value="75k" unit="ha" /> */}
        <Stat title="Orthophotos" value="1000+" unit="" />
        <Stat title="Labeled Polygons" value="40k" unit="" />
        <Stat title="Countries" value="63" unit="" />
        <Stat title="Institutions" value="43" unit="" />
      </div>
    </div>
  );
};

const Gallery = () => {
  const { data } = useData();
  const carouselRef = useRef<any>(null);
  const navigate = useNavigate();

  // Sort by id and filter for unique authors
  const sortedUniqueData = useMemo(() => {
    if (!data) return [];

    const sorted = [...data].sort((a, b) => b.id + a.id);

    const authorMap = new Map();
    return sorted.filter(item => {
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
        }
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        }
      }
    ]
  };

  return (
    <div className="hidden md:block">
      <div className="m-auto w-full rounded-xl md:w-full md:mt-36 bg-gradient-to-t from-white to-purple-50 p-8">
        <p className="text-lg text-center font-semibold text-blue-600">EXPLORE OUR DATABASE</p>
        <p className="m-0 text-4xl font-semibold md:text-5xl text-center">Global Tree Mortality Atlas</p>
        <p className="m-auto max-w-4xl pt-8 text-left text-lg text-gray-500">
          Browse our growing collection of aerial imagery datasets showing tree mortality patterns. Each dataset includes high-resolution orthophotos and optional polygon annotations of dead trees, contributed by researchers worldwide.
        </p>
        <div className="relative px-4 pt-8">
          {/* Navigation Buttons */}
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

          {/* Carousel */}
          <div className="mx-8">
            <Carousel ref={carouselRef} {...settings}>
              {sortedUniqueData.map((item) => (
                <div key={item.id} className="px-2 py-4">
                  <div
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                    onClick={() => onClickHandler(item.id)}
                  >
                    <img
                      src={item.thumbnail_path ? Settings.THUMBNAIL_URL + item.thumbnail_path : "/assets/tree-icon.png"}
                      className="h-48 w-full object-cover rounded-t-lg"
                      loading="lazy"
                      alt={`Dataset ${item.id}`}
                    />
                    <div className="p-4">
                      <div className="flex justify-between items-baseline mb-2">
                        <Tooltip title={item.admin_level_3}>
                          <span className="font-semibold truncate max-w-[70%]">
                            {item.admin_level_3 && item.admin_level_3.slice(0, 15) + (item.admin_level_3.length > 15 ? "..." : "")}
                          </span>
                        </Tooltip>
                        <span className="text-xs text-gray-500">
                          {new Date(item.aquisition_year, item.aquisition_month, item.aquisition_day).toLocaleDateString("en-US", {
                            year: "numeric",
                            ...(item.aquisition_month && { month: "numeric" }),
                            ...(item.aquisition_day && { day: "numeric" })
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Tooltip title={item.authors}>
                          <span className="text-sm text-gray-600 truncate max-w-[70%]">
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
    </div >
  );
};

const Feature = ({ title, description, iconPath }: { title: string; description: string; iconPath: string }) => {
  return (
    <div className="mb-4 w-full rounded-md py-8">
      <div className="flex">
        <div className="mr-8 flex aspect-square h-16 items-center justify-center rounded-lg bg-blue-500">
          <img className="h-8" src={iconPath} />
        </div>
        <div className="text-start">
          <p className="m-0 text-2xl font-semibold">{title}</p>
          {/* hide on smaller screens */}
          <p className=" m-0 hidden pt-2 text-lg text-gray-500 md:block">{description}</p>
        </div>
      </div>
      {/* hide on large screens */}
      <p className="m-0 pt-4 text-lg text-gray-500 md:hidden">{description}</p>
    </div>
  );
};

const Features = () => {
  return (
    <div className="pt-24 md:pt-36 md:text-center ">
      <p className="text-lg font-semibold text-blue-600">OUR SERVICES TO THE COMMUNITY</p>
      <p className="m-0 text-4xl font-semibold md:text-6xl">Revealing tree mortality patterns</p>
      <p className="m-auto max-w-4xl pt-8 text-left text-lg text-gray-500">
        By integrating Earth observation, machine learning, and ground-based data sources, this initiative aims to
        bridge the existing gaps in understanding global tree mortality dynamics, fostering a comprehensive and
        accessible resource for researchers and stakeholders alike.
      </p>
      <div className="pt-12 md:flex md:pt-24">
        <Feature
          title="Open access community effort"
          description="Upload and download your aerial imagery with optional delineations of standing deadwood. 
          Every contributor will be credited and invited to collaborate."
          iconPath="assets/open-access-icon.svg"
        />
        <Feature
          title="Automatic dead tree detection"
          description="Automatic detection (semantic segmentation) of dead trees in uploaded aerial imagery through a generic detection computer vision model."
          iconPath="assets/ai-icon.svg"
        />
      </div>
      <div className=" md:flex">
        <Feature
          title="Large-scale tree mortality map"
          description="Embedded visualization and download of extensive spatiotemporal tree mortality products derived from extrapolating standing deadwood using Earth observation data."
          iconPath="assets/maps-icon.svg"
        />
        <Feature
          title="Analysis ready training data"
          description="High-resolution aerial imagery of forests worldwide together with delineated standing deadwood which can be used for training your own AI models."
          iconPath="assets/database-icon.svg"
        />
      </div>
    </div>
  );
};

const RoadmapItemDate = ({ date }: { date: string }) => {
  return <span className="text-xl font-semibold">{date}</span>;
};
const RoadmapItemLabel = ({ label }: { label: string }) => {
  return <span className="m-0 pt-4 text-lg text-gray-500">{label}</span>;
};

const Roadmap = () => {
  return (
    <div className="m-auto flex max-w-4xl flex-col pt-24  md:flex-row">
      <div className="mb-8 text-center md:text-left">
        <p className="m-auto text-2xl font-semibold text-blue-600 md:mt-0">OUR ROADMAP</p>
        <p className="text-lg text-gray-500">Our vision and goals for the future</p>
      </div>
      <Timeline
        mode="left"
        items={[
          {
            label: RoadmapItemDate({ date: "Q1 2025" }),
            color: "gray",
            children: <RoadmapItemLabel label="Analysis ready training data for AI models" />,
          },
          {
            label: RoadmapItemDate({ date: "Q1 2025" }),
            color: "gray",
            children: (
              <RoadmapItemLabel label="Integration of a large-scale tree mortality map using satellite data (sentinel)" />
            ),
          },
          {
            label: RoadmapItemDate({ date: "Q4 2024" }),
            color: "blue",
            children: <RoadmapItemLabel label="Automated segmentation of dead trees in airborne and drone images" />,
          },
          {
            label: RoadmapItemDate({ date: "Q3 2024" }),
            color: "blue",
            children: <RoadmapItemLabel label="Automated integration and visualisation of uploaded data" />,
          },
          {
            label: RoadmapItemDate({ date: "Q2 2024" }),
            color: "blue",
            children: (
              <RoadmapItemLabel label="Download and upload functionality of drone images and tree mortality labels" />
            ),
          },
          {
            label: RoadmapItemDate({ date: "Q2 2024" }),
            color: "blue",
            children: (
              <RoadmapItemLabel label="Public release of a beta version of the platform and start of data collection" />
            ),
          },
        ]}
      />
    </div>
  );
};

const GetInContact = () => {
  const navigate = useNavigate();
  return (
    <div className="m-auto mt-24 max-w-6xl rounded-xl bg-slate-100 p-8">
      <p className="m-0 text-center text-3xl font-semibold text-gray-800 md:text-4xl">Want to join?</p>
      <p className="m-auto max-w-3xl pt-8 text-center text-lg text-gray-500">
        {`Do you have high-resolution (<20cm) orthoimagery and `}
        <em>optionally</em>
        {` any labels for standing deadwood? We'd be excited to have you collaborate with us on this project.`}
      </p>
      <div className="flex justify-center pt-8 space-x-4">
        <Button className="md:block hidden" type="primary" size="large" onClick={() => navigate("/profile")}>
          Upload imagery
        </Button>
        <Button
          size="large"
          href="mailto:teja.kattenborn@geosense.uni-freiburg.de;janusch.jehle@felis.uni-freiburg.de;clemens.mosig@uni-leipzig.de?subject=deadtrees.earth collaboration"
        >
          Get in touch
        </Button>
      </div>
    </div>
  );
};

const FAQ = () => {
  const { collaborators } = useData();

  const FAQItems = [
    {
      key: "1",
      label: <span className="m-0 pt-4 text-lg text-gray-500">Who is behind deadtrees.earth?</span>,
      children: (
        <div>
          <p className="text-md">
            This initiative is being led by Prof. Dr. Teja Kattenborn from
            <a href="https://geosense.uni-freiburg.de/en"> geosense </a>
            and Clemens Mosig from <a href="https://rsc4earth.de/"> RSC4Earth </a> /
            <a href="https://scads.ai/"> ScaDS.AI </a>
            and the service is being built by <a href="https://hydrocode.de/home"> hydrocode </a>.
          </p>
          <p className="text-md font-semibold">Data Contributors and collaborators:</p>
          <ul className="text-md">
            {collaborators && collaborators.length > 0
              ? collaborators
                .sort((a, b) => a.collaborator_text.localeCompare(b.collaborator_text))
                .map((collaborator) => {
                  return <li key={collaborator.id}>{collaborator.collaborator_text}</li>;
                })
              : <li>Loading collaborators...</li>
            }
          </ul>
        </div>
      ),
      style: {
        border: "none",
        borderRadius: "0.5rem",
        marginBottom: "24px",
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingTop: "16px",
        paddingBottom: "16px",
        backgroundColor: "rgb(241 245 249)",
      },
    },
    {
      key: "2",
      label: <span className="m-0 pt-4 text-lg text-gray-500">What happens to the data after your upload?</span>,

      children: (
        <p className="text-md">
          The data is used to train multiple models related to standing deadwood. If you agree, we will also make your
          data publicly available to the community under a chosen Creative Commons license.
        </p>
      ),
      style: {
        border: "none",
        borderRadius: "0.5rem",
        marginBottom: "24px",
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingTop: "16px",
        paddingBottom: "16px",
        backgroundColor: "rgb(241 245 249)",
      },
    },
    {
      key: "3",
      label: <span className="m-0 pt-4 text-lg text-gray-500">Why can't I download the data?</span>,

      children: (
        <p className="text-md">
          We are currently working on the download and upload functionality which will be available soon. To stay
          updated, please subscribe to our newsletter. For more information, check out our roadmap or contact us.
        </p>
      ),
      style: {
        border: "none",
        borderRadius: "0.5rem",
        marginBottom: "24px",
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingTop: "16px",
        paddingBottom: "16px",
        backgroundColor: "rgb(241 245 249)",
      },
    },
  ];

  return (
    <div className="my-24 md:mt-36">
      <h1 className="m-auto text-center text-3xl font-semibold text-gray-800 md:text-4xl">
        Frequently Asked Questions
      </h1>
      <Collapse
        bordered={false}
        style={{ backgroundColor: "transparent" }}
        // defaultActiveKey={["1"]}
        className="w-5xl mt-16"
        items={FAQItems}
      />
    </div>
  );
};

export default function HomePage() {
  return (
    <div className="m-auto max-w-6xl pb-1">
      {/* <div className="m-auto flex max-w-lg flex-col justify-around md:h-[calc(100vh-74px)] md:max-w-6xl md:justify-around"> */}
      <Hero />
      {/* <div className="hidden md:block"> */}
      {/* </div> */}
      {/* </div> */}
      {/* <div className="md:hidden"> */}
      {/* <Stats /> */}
      {/* </div> */}
      <LogoBannerBand />
      <Gallery />
      <Features />
      <Roadmap />
      <GetInContact />
      <FAQ />
    </div>
  );
}
