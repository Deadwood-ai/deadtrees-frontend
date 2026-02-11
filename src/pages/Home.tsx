import { Collapse } from "antd";

import LogoBannerBand from "../components/Home/LogoBanner";
import Hero from "../components/Home/Hero";
import DataGallery from "../components/Home/DataGallery";
import Features from "../components/Home/Features";
import Roadmap from "../components/Home/Roadmap";
import GetInContact from "../components/Home/GetInContact";

import { useData } from "../hooks/useDataProvider";

const logos = [
  { path: "assets/logos/esa.jpg" },
  { path: "assets/logos/dfg.jpeg" },
  { path: "assets/logos/uni-freiburg.png" },
  { path: "RSC4Earth" },
  { path: "assets/logos/NFDI4Earth_logo.jpg" },
  { path: "assets/logos/scads.png" },
  { path: "assets/logos/MLR.png" },
  { path: "assets/logos/dlr.jpeg" },
  { path: "assets/logos/geonadir.png" },
  { path: "assets/logos/bmwk.jpg", height: "h-24" },
];

const FAQ = () => {
  const { authors } = useData();
  const contributorNames = (authors || []).map((author) => author.label).sort((a, b) => a.localeCompare(b));

  const FAQItems = [
    {
      key: "1",
      label: <span className="m-0 pt-4 text-lg text-gray-500">Who is behind deadtrees.earth?</span>,
      children: (
        <div>
          <p className="text-md">
            This initiative is being led by{" "}
            <a href="https://uni-freiburg.de/enr-geosense/team/kattenborn/">Prof. Dr. Teja Kattenborn</a> from
            <a href="https://geosense.uni-freiburg.de/en"> geosense </a>
            and <a href="https://rsc4earth.de/author/clemens-mosig/"> Clemens Mosig </a> from{" "}
            <a href="https://rsc4earth.de/"> RSC4Earth </a> /<a href="https://scads.ai/"> ScaDS.AI </a>
            and the service is being built by{" "}
            <a href="https://uni-freiburg.de/enr-geosense/team/janusch_vajna_jehle/">Janusch Vajna-Jehle</a> and
            <a href="https://hydrocode.de/home"> hydrocode. </a>
          </p>
          <p className="text-md font-semibold">Data contributors:</p>
          <p className="text-md">
            {contributorNames.length > 0 ? contributorNames.join(", ") : "Loading contributors..."}
          </p>
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
        <div>
          <p className="text-md">
            The data is processed to detect standing deadwood and used to train our machine learning models. By default,
            all uploaded data is made publicly available under the Creative Commons Attribution (CC BY) license, though
            you can request private usage for model training only if needed.
          </p>
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
      key: "3",
      label: (
        <span className="m-0 pt-4 text-lg text-gray-500">
          Why do we use Creative Commons Attribution (CC BY) licensing?
        </span>
      ),
      children: (
        <div>
          <p className="text-md">
            As scientists working for the common good, we believe research data should maximize its positive impact. The
            CC BY license is critical for our mission because it:
          </p>
          <ul className="text-md list-disc space-y-2 pl-5">
            <li>
              <strong>Removes barriers to innovation:</strong> More restrictive licenses can unintentionally prevent
              valuable applications and services from being developed
            </li>
            <li>
              <strong>Accelerates research:</strong> Open data enables faster validation, replication, and extension of
              research findings
            </li>
            <li>
              <strong>Ensures attribution:</strong> Original contributors always receive proper credit for their work
            </li>
            <li>
              <strong>Supports machine learning advancement:</strong> Building effective AI models for forest monitoring
              requires diverse, high-quality training data
            </li>
          </ul>
          <p className="text-md mt-2">
            Our goal is to create a comprehensive ground truth dataset for forest applications that benefits the entire
            scientific community, climate research, and conservation efforts. This is only achievable when data is
            available under licenses that optimize reuse and further development.
          </p>
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
      key: "4",
      label: <span className="m-0 pt-4 text-lg text-gray-500">Why can't I download all the data at once?</span>,
      children: (
        <div>
          <p className="text-md">
            Individual datasets are available for immediate download, including both orthophotos and machine-generated
            deadwood labels in GeoPackage format. However, our complete database currently exceeds several terabytes in
            size, making bulk downloads challenging.
          </p>
          <p className="text-md mt-2">We're actively developing improved infrastructure to enable:</p>
          <ul className="text-md list-disc space-y-1 pl-5">
            <li>Filtered bulk downloads based on geographic region or specific criteria</li>
            <li>API access for programmatic data retrieval</li>
            <li>Direct integration with GIS software</li>
          </ul>
          <p className="text-md mt-2">
            For specialized research needs requiring access to larger portions of the database, please{" "}
            <a href="mailto:info@deadtrees.earth?subject=deadtrees.earth bulk data access">contact our team</a> to
            discuss custom data delivery options.
          </p>
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
      key: "5",
      label: <span className="m-0 pt-4 text-lg text-gray-500">What kinds of data can I contribute?</span>,
      children: (
        <div>
          <p className="text-md">
            We primarily seek high-resolution aerial orthophotos showing forest areas with standing deadwood. To be
            suitable for our platform:
          </p>
          <ul className="text-md list-disc pl-5">
            <li>
              <strong>Resolution:</strong> Better than 10 cm (higher resolution provides better detection results)
            </li>
            <li>
              <strong>Format:</strong> GeoTIFF or ZIP of raw images (recommended overlap 85% vs. 75%)
            </li>

            <li>
              <strong>Optional:</strong> Vector data (GeoJSON, Shapefile, GeoPackage) with deadwood labels or other
              reference data
            </li>
          </ul>
          <p className="text-md mt-2">
            All contributors receive proper attribution. While our default is to publish under CC BY licensing to
            maximize scientific impact, we understand some datasets may have restrictions. If you have concerns or
            special requirements, please{" "}
            <a href="mailto:info@deadtrees.earth?subject=deadtrees.earth data contribution">contact us</a>.
          </p>
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
    <div className="pb-1">
      <Hero />
      <section className="w-full border-y border-slate-100 bg-white">
        <div className="m-auto max-w-6xl px-4 md:px-0">
          <LogoBannerBand logos={logos} title="Supported by" />
        </div>
      </section>
      <div className="m-auto max-w-6xl px-4 md:px-0">
        <DataGallery />
        <Features />
        <Roadmap />
        <GetInContact />
        <FAQ />
      </div>
    </div>
  );
}
