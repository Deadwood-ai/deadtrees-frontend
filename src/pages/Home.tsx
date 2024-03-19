import { SecurityScanFilled } from "@ant-design/icons";
import Icon from "@ant-design/icons/lib/components/Icon";
import { Typography, Image, Input, Button } from "antd";
import Slider from "react-slick";

const Hero = () => {
  return (
    <div className="flex items-center">
      <div className="t-16 flex-1">
        <div>
          <p className="text-md inline-block rounded-3xl bg-yellow-400 p-2  font-semibold text-gray-600">
            COMING SOON
          </p>
        </div>
        <h1 className="m-0 inline-block bg-gradient-to-r from-blue-700 to-purple-500 bg-clip-text pb-4 text-5xl font-bold text-gray-800 text-transparent">
          deadtrees.earth
        </h1>
        <p className="m-0 max-w-md text-lg text-gray-500">
          An open database for accessing, contributing, analyzing, and
          visualizing remote sensing-based tree mortality data.
        </p>
        <div className="pt-16">
          <p className="m-0 pb-1 text-sm text-gray-500">
            Get notified as soon as the service is up and running.
          </p>
          <div className="flex pt-2">
            <Input
              className="max-w-xs"
              size="large"
              placeholder="Enter email..."
            />
            <Button className="ml-4" type="primary" size="large">
              Get notified
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 p-8">
        <img
          src="public/assets/compressed/hero-image.png"
          alt="deadtrees.earth"
          className="w-4/5 rounded-3xl object-center"
        />
      </div>
    </div>
  );
};

const Stat = ({
  title,
  value,
  unit,
}: {
  title: string;
  value: string;
  unit: string;
}) => {
  return (
    <div className="m-auto rounded-xl bg-white px-6 py-6">
      <div className="flex items-baseline justify-center">
        <p className="m-0 text-3xl font-medium text-blue-600">{value}</p>
        <p className="m-0 pl-1 text-lg font-medium capitalize text-blue-500">
          {unit}
        </p>
      </div>
      <p className="m-0 p-3 text-sm font-medium uppercase">{title}</p>
    </div>
  );
};

const Stats = () => {
  return (
    <div className="pt-24">
      <div className="text-center">
        <p className="text-xl font-semibold text-blue-600">CURRENT STATS</p>
      </div>
      <div className="flex justify-around pt-8">
        <Stat title="Area covered" value="24 555" unit="ha" />
        <Stat title="Orthophotos" value="421" unit="" />
        <Stat title="Countries" value="16" unit="" />
        <Stat title="Contributors" value="29" unit="" />
      </div>
    </div>
  );
};

const Gallery = () => {
  const settings = {
    // dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
  };
  return (
    <div className="m-auto pt-48">
      <Slider {...settings}>
        {[
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
          21, 22, 23,
        ].map((i) => {
          return (
            <div key={i}>
              <img
                className="h-56 rounded-md"
                src={`assets/compressed/image${i}.png`}
                alt="deadtrees.earth"
              />
            </div>
          );
        })}
      </Slider>
    </div>
  );
};

const Feature = ({
  title,
  description,
  iconPath,
}: {
  title: string;
  description: string;
  iconPath: string;
}) => {
  return (
    <div className="flex p-8">
      <div className=" mr-8 flex aspect-square h-16 w-16 items-center justify-center rounded-lg bg-blue-500">
        <img className="h-8" src={iconPath} />
      </div>
      <div className="text-start">
        <p className="m-0 text-2xl font-semibold">{title}</p>
        <p className="m-0 pt-2 text-lg text-gray-500">{description}</p>
      </div>
    </div>
  );
};

const Features = () => {
  return (
    <div className="pt-36 text-center">
      <p className="text-lg font-semibold text-blue-600">
        OUR SERVICES TO THE COMMUNITY
      </p>
      <p className="text-4xl font-semibold">
        Revealing tree mortality patterns
      </p>
      <p className="m-auto max-w-4xl text-left text-lg text-gray-500">
        By integrating Earth observation, machine learning, and ground-based
        data sources, this initiative aims to bridge the existing gaps in
        understanding global tree mortality dynamics, fostering a comprehensive
        and accessible resource for researchers and stakeholders alike.
      </p>
      <div className="flex pt-24">
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
      <div className="flex">
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

export default function HomePage() {
  return (
    <div className="m-auto max-w-6xl">
      <Hero />
      <Stats />
      <Gallery />
      <Features />
    </div>
  );
}
