import { Link } from "react-router-dom";
import { Button } from "antd";
import { CloudUploadOutlined, GlobalOutlined, FileImageOutlined, FolderOpenOutlined } from "@ant-design/icons";
import DataGallery from "./DataGallery";
import MiniSatelliteMap from "./MiniSatelliteMap";

const UploadIllustration = () => (
  <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl bg-white p-8 shadow-sm">
    <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-5xl text-green-700 ring-8 ring-emerald-50/50">
      <CloudUploadOutlined />
    </div>
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <FileImageOutlined className="text-2xl text-blue-500" />
        <div className="flex-1">
          <div className="h-2 w-24 rounded bg-gray-300"></div>
          <div className="mt-2 h-2 w-16 rounded bg-gray-200"></div>
        </div>
        <div className="text-xs font-bold text-green-600">DONE</div>
      </div>
      <div className="flex items-center gap-4 rounded-lg border border-emerald-100 bg-emerald-50/30 p-4">
        <FolderOpenOutlined className="text-2xl text-amber-500" />
        <div className="flex-1">
          <div className="h-2 w-32 rounded bg-gray-300"></div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full w-2/3 bg-green-500"></div>
          </div>
        </div>
        <div className="text-xs font-bold text-gray-500">68%</div>
      </div>
    </div>
  </div>
);

const HowItWorks = () => {
  return (
    <div className="py-24 md:py-32">
      <div className="mb-20 text-center">
        <p className="mb-2 text-lg font-semibold uppercase tracking-wider text-[#1B5E35]">
          The Pipeline
        </p>
        <h2 className="m-0 text-4xl font-semibold text-gray-800 md:text-5xl">
          From drone imagery to global models
        </h2>
        <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-600">
          By integrating Earth observation, machine learning, and ground-based data sources, this initiative aims to bridge the existing gaps in understanding global tree mortality dynamics.
        </p>
      </div>

      <div className="flex flex-col gap-24 md:gap-32">
        {/* Step 1: Drone Upload */}
        <div className="flex flex-col items-center gap-10 md:flex-row lg:gap-20">
          <div className="flex-1 text-left order-2 md:order-1">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-[#E8F3EB] px-4 py-1.5 text-sm font-bold text-[#1B5E35]">
              STEP 01
            </div>
            <h3 className="mb-4 text-3xl font-semibold text-gray-800 md:text-4xl">
              Contribute Drone Data
            </h3>
            <p className="mb-8 text-lg text-gray-600">
              Upload your high-resolution drone imagery of forests via your user profile. We primarily seek aerial orthophotos (resolution &lt; 10 cm) showing forest areas with standing deadwood. Every contributor will be credited and invited to collaborate in our open access community effort.
            </p>
            <Link to="/profile">
              <Button type="primary" size="large" icon={<CloudUploadOutlined />}>
                Upload via Profile
              </Button>
            </Link>
          </div>
          <div className="w-full flex-1 order-1 md:order-2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-50 shadow-inner ring-1 ring-black/5">
              <UploadIllustration />
            </div>
          </div>
        </div>

        {/* Step 2: AI Processing & Archive */}
        <div className="flex flex-col gap-10 pt-4">
          <div className="text-center md:mx-auto md:max-w-3xl">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-[#E8F3EB] px-4 py-1.5 text-sm font-bold text-[#1B5E35]">
              STEP 02
            </div>
            <h3 className="mb-4 text-3xl font-semibold text-gray-800 md:text-4xl">
              AI Processing & Open Archive
            </h3>
            <p className="text-lg text-gray-600">
              Our models automatically detect deadwood and forest cover in your uploaded imagery through semantic segmentation. The results are aggregated into an analysis-ready training database, freely accessible for researchers worldwide.
            </p>
          </div>
          <div className="-mx-4 md:mx-0 relative z-10">
             <DataGallery hideHeader={true} />
          </div>
        </div>

        {/* Step 3: Satellite Upscaling */}
        <div className="flex flex-col items-center gap-10 md:flex-row lg:gap-20">
          <div className="w-full flex-1">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5 bg-gray-100">
              <MiniSatelliteMap />
            </div>
          </div>
          <div className="flex-1 text-left">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-[#E8F3EB] px-4 py-1.5 text-sm font-bold text-[#1B5E35]">
              STEP 03
            </div>
            <h3 className="mb-4 text-3xl font-semibold text-gray-800 md:text-4xl">
              Satellite Upscaling
            </h3>
            <p className="mb-8 text-lg text-gray-600">
              The high-resolution ground truth trains our satellite models to generate large-scale spatiotemporal maps of forest mortality at the European scale. We provide embedded visualization and download of these extensive tree mortality products.
            </p>
            <Link to="/deadtrees">
              <Button type="primary" size="large" icon={<GlobalOutlined />}>
                Explore Satellite Maps
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
