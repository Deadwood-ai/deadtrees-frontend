import { Input, Button, Collapse, notification, Alert, Timeline } from "antd";
import { useState } from "react";
import Slider from "react-slick";

import { supabase } from "../components/useSupabase";

const Hero = () => {
  const [email, setEmail] = useState<string>("");

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
    const { data, error } = await supabase
      .from("newsletter")
      .insert([{ email }]);
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
        description:
          "You will be notified as soon as the service is up and running.",
        placement: "topRight",
      });
      console.log("Subscriber added:", email);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-around">
      <div className="md:max-w-md">
        <div className="md:hidden">
          <Alert
            message="Mobile version is limited"
            description="Please use a desktop browser for the best experience."
            type="info"
            showIcon
            closable
          />
        </div>
        <div>
          <p className="text-md inline-block rounded-3xl bg-yellow-400 p-2  font-semibold text-gray-600">
            BETA
          </p>
        </div>
        <h1 className="m-0 bg-gradient-to-r from-blue-700 to-purple-500 bg-clip-text pb-4 text-4xl font-bold text-gray-800 text-transparent md:text-5xl">
          deadtrees.earth
        </h1>
        <p className="m-0 text-lg text-gray-500 md:max-w-md">
          An open database for accessing, contributing, analyzing, and
          visualizing remote sensing-based tree mortality data.
        </p>
        <div className="pt-16">
          <p className="m-0 pb-1 text-sm text-gray-500">
            Get notified as soon as the service is up and running.
          </p>
          <div className="grid space-y-2 pt-2 md:flex md:space-y-0">
            <Input
              // className="max-w-xs"
              size="large"
              placeholder="Enter email..."
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              onClick={addSubscriber}
              className="md:ml-4"
              type="primary"
              size="large"
            >
              Get notified
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-16 hidden md:mt-0 md:block  md:p-8">
        <img
          src="assets/compressed/hero-image.png"
          alt="deadtrees.earth"
          className="w-full rounded-3xl md:max-w-96"
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
    <div className="m-auto rounded-xl  px-6 py-6 md:bg-white">
      <div className="flex items-baseline justify-center">
        <p className="m-0 text-3xl font-medium text-blue-600">{value}</p>
        <p className="m-0 pl-1 text-lg font-medium  text-blue-500">{unit}</p>
      </div>
      <p className="m-0 p-3 text-sm font-medium uppercase">{title}</p>
    </div>
  );
};

const Stats = () => {
  return (
    <div className="mt-16 flex flex-col justify-center py-4 align-middle md:mt-0">
      <div className="text-center">
        <p className="text-xl font-semibold text-blue-600">CURRENT STATS</p>
      </div>
      <div className="grid grid-cols-2 pt-8 md:flex md:justify-around">
        <Stat title="covered" value="75k" unit="ha" />
        <Stat title="Orthophotos" value="912" unit="" />
        <Stat title="Countries" value="18" unit="" />
        <Stat title="Contributors" value="47" unit="" />
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
    // adding buttons

    responsive: [
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2,
        },
      },
    ],
  };
  return (
    <div className="m-auto w-full pt-12 md:w-full md:pt-24">
      <p className="pb-8 text-center text-lg font-semibold uppercase text-blue-600">
        Some of the imagery
      </p>
      <Slider {...settings}>
        {[
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
          21, 22, 23,
        ].map((i) => {
          return (
            <div className="m-auto" key={i}>
              <img
                className="w-full items-center rounded-xl md:w-56"
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
    <div className="mb-4 w-full rounded-md py-8">
      <div className="flex">
        <div className="mr-8 flex aspect-square h-16 items-center justify-center rounded-lg bg-blue-500">
          <img className="h-8" src={iconPath} />
        </div>
        <div className="text-start">
          <p className="m-0 text-2xl font-semibold">{title}</p>
          {/* hide on smaller screens */}
          <p className=" m-0 hidden pt-2 text-lg text-gray-500 md:block">
            {description}
          </p>
        </div>
      </div>
      {/* hide on large screens */}
      <p className="m-0 pt-4 text-lg text-gray-500 md:hidden">{description}</p>
    </div>
  );
};

const Features = () => {
  return (
    <div className="pt-16 md:pt-36 md:text-center ">
      <p className="text-lg font-semibold text-blue-600">
        OUR SERVICES TO THE COMMUNITY
      </p>
      <p className="m-0 text-4xl font-semibold md:text-6xl">
        Revealing tree mortality patterns
      </p>
      <p className="m-auto max-w-4xl pt-8 text-left text-lg text-gray-500">
        By integrating Earth observation, machine learning, and ground-based
        data sources, this initiative aims to bridge the existing gaps in
        understanding global tree mortality dynamics, fostering a comprehensive
        and accessible resource for researchers and stakeholders alike.
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
    <div className="m-auto flex max-w-3xl flex-col pt-24  md:flex-row">
      <div className="mb-8 text-center md:text-left">
        <p className="m-auto text-2xl font-semibold text-blue-600 md:mt-0">
          OUR ROADMAP
        </p>
        <p className="text-lg text-gray-500">
          Our vision and goals for the future
        </p>
      </div>
      <Timeline
        mode="left"
        items={[
          {
            label: RoadmapItemDate({ date: "Q2 2024" }),
            color: "blue",
            children: (
              <RoadmapItemLabel label="Public release of a beta version of the platform and start of data collection" />
            ),
          },
          {
            label: RoadmapItemDate({ date: "Q2 2024" }),
            color: "gray",
            children: (
              <RoadmapItemLabel label="Download and upload functionality of drone images and tree mortality labels" />
            ),
          },
          {
            label: RoadmapItemDate({ date: "Q3 2024" }),
            color: "gray",
            children: (
              <RoadmapItemLabel label="Automated segmentation of dead trees in airborne and drone images" />
            ),
          },
          {
            label: RoadmapItemDate({ date: "Q4 2024" }),
            color: "gray",
            children: (
              <RoadmapItemLabel label="Integration of a large-scale tree mortality map using satellite data (sentinel)" />
            ),
          },
          {
            label: RoadmapItemDate({ date: "Q4 2024" }),
            color: "gray",
            children: (
              <RoadmapItemLabel label="Analysis ready training data for AI models" />
            ),
          },
        ]}
      />
    </div>
  );
};

const GetInContact = () => {
  return (
    <div className="m-auto mt-24 max-w-5xl rounded-xl bg-slate-100 p-8">
      <p className="m-0 text-center text-3xl font-semibold text-gray-800 md:text-4xl">
        Want to join?
      </p>
      <p className="m-auto max-w-xl pt-8 text-center text-lg text-gray-500">
        {`Do you have high-resolution (<20cm) orthoimagery and optionally any labels for standing deadwood? We'd be excited to have you collaborate with us on this project.`}
      </p>
      <div className="flex justify-center pt-8">
        <Button
          type="primary"
          size="large"
          href="mailto:teja.kattenborn@geosense.uni-freiburg.de;janusch.jehle@felis.uni-freiburg.de;clemens.mosig@uni-leipzig.de?subject=deadtrees.earth collaboration"
        >
          Get in touch
        </Button>
      </div>
    </div>
  );
};

const FAQItems = [
  {
    key: "1",
    label: (
      <span className="m-0 pt-4 text-lg text-gray-500">
        Who is behind deadtrees.earth?
      </span>
    ),
    children: (
      <div>
        <p className="text-md">
          This initiative is being led by Prof. Dr. Teja Kattenborn from
          <a href="https://geosense.uni-freiburg.de/en"> geosense </a>
          and Clemens Mosig from <a href="https://rsc4earth.de/">
            {" "}
            RSC4Earth{" "}
          </a>{" "}
          /<a href="https://scads.ai/"> ScaDS.AI </a>
          and the service is being built by{" "}
          <a href="https://hydrocode.de/home"> hydrocode </a>.
        </p>
        <p className="text-md font-semibold">
          Data Contributors and collaborators:
        </p>
        <ul className="text-md">
          <li>Alfred Wegner Institute (Stefan Kruse)</li>
          <li>Chinese Academy of Sciences (Yanjun Su)</li>
          <li>
            Forest Research Institute (Katarzyna Zielewska-Büttner, Selina Ganz,
            Andreas Uhl)
          </li>
          <li>Freie University Berlin (Fabian Fassnacht)</li>
          <li>
            K. N. Toosi University of Technology (Hooman Latifi, Marziye
            Ghasemi)
          </li>
          <li>
            Karlsruhe Institute of Technology (Elham Shafeian, Felix Schiefer,
            Mirko Mälicke)
          </li>
          <li>
            Leipzig University (Clemens Mosig, Miguel Mahecha, Jakobus Möhring,
            Djamil Al-Halbouni, David Montero)
          </li>
          <li>Luftbild Umwelt Planung GmbH (Annett Frick)</li>
          <li>Nanjing Normal University (Qin Ma, Yanjun Su)</li>
          <li>Nelson Mandela University (Alastair Potts)</li>
          <li>Oak Ridge National Laboratory (KC Cushman)</li>
          <li>Potsdam University (Marie-Therese-Schmehl)</li>
          <li>Purdue University (Joseph Hupy)</li>
          <li>
            Smithsonian Tropical Research Institute (Helene-Müller-Landau,
            Vicente Vásquez, Milton García, Melvin Hernández)
          </li>
          <li>Swiss Data Science Center (Michele Volpi)</li>
          <li>Swiss National Park (Samuel Wiesmann, Christian Rossi) </li>
          <li>Universidad Adolfo Ibáñez (Javier Lopatin)</li>

          <li>Université de Montréal (Myriam Cloutier, Etienne Laliberté)</li>
          <li>University of Copenhagen (Yan Cheng, Stéphanie Horion)</li>
          <li>University of Cordoba (Oscar Perez Priego)</li>
          <li>University of Florida (Ben Weinstein)</li>
          <li>
            University of Freiburg (Teja Kattenborn, Julian Frey, Martin Denter,
            Anna Göritz, Janusch Jehle)
          </li>
          <li>
            University of Marburg (Chris Reudenbach, Christian Mestre Runge,
            Lars Oppgenoorth)
          </li>
          <li>University of Washington (Pratima Khatri-Chhetri)</li>
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
    label: (
      <span className="m-0 pt-4 text-lg text-gray-500">
        What happens to the data after your upload?
      </span>
    ),

    children: (
      <p className="text-md">
        The data is used to train multiple models related to standing deadwood.
        If you agree, we will also make your data publicly available to the
        community under a chosen Creative Commons license.
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
    label: (
      <span className="m-0 pt-4 text-lg text-gray-500">
        Why can't I download the data?
      </span>
    ),

    children: (
      <p className="text-md">
        We are currently working on the download and upload functionality which
        will be available soon. To stay updated, please subscribe to our
        newsletter. For more information, check out our roadmap or contact us.
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

const FAQ = () => {
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
      <div className="m-auto flex max-w-lg flex-col justify-around md:h-[calc(100vh-74px)] md:max-w-6xl md:justify-around">
        <Hero />
        <div className="hidden md:block">
          <Stats />
        </div>
      </div>
      <div className="md:hidden">
        <Stats />
      </div>
      <Gallery />
      <Features />
      <Roadmap />
      <GetInContact />
      <FAQ />
    </div>
  );
}
