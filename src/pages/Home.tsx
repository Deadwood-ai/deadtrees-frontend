import { Input, Button, Collapse, notification, Alert } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import LogoBannerBand from "../components/Home/LogoBanner";
import Hero from "../components/Home/Hero";
import DataGallery from "../components/Home/DataGallery";
import Features from "../components/Home/Features";
import Roadmap from "../components/Home/Roadmap";
import GetInContact from "../components/Home/GetInContact";

import { useData } from "../hooks/useDataProvider";
import { Tooltip } from "antd";
import { Settings } from "../config";
import countryList from "../utils/countryList";

const logos = [
  { path: "assets/logos/MLR.png" },
  { path: "assets/logos/esa.jpg" },
  { path: "assets/logos/dfg.jpeg" },
  { path: "assets/logos/uni-freiburg.png" },
  { text: "RSC4Earth" },
  { path: "assets/logos/NFDI4Earth_logo.jpg" },
  { path: "assets/logos/scads.png" },
];

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
            {collaborators && collaborators.length > 0 ? (
              collaborators
                .sort((a, b) => a.collaborator_text.localeCompare(b.collaborator_text))
                .map((collaborator) => {
                  return <li key={collaborator.id}>{collaborator.collaborator_text}</li>;
                })
            ) : (
              <li>Loading collaborators...</li>
            )}
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
      label: <span className="m-0 pt-4 text-lg text-gray-500">Why can't I download all the data at once?</span>,
      children: (
        <p className="text-md">
          Individual datasets are available for download right now. However, since our complete database is several
          terabytes in size, we are still optimizing our infrastructure to enable bulk downloads of the entire dataset.
          This feature will be available soon. To stay updated on our progress, please subscribe to our newsletter.
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
    <div className="my-24 px-4 md:mt-36">
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
    <div className="m-auto max-w-6xl px-4 pb-1 md:px-0">
      <Hero />
      <LogoBannerBand logos={logos} title="Supported by" />
      <DataGallery />
      <Features />
      <Roadmap />
      <GetInContact />
      <FAQ />
    </div>
  );
}
