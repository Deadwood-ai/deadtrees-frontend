import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "antd";
import { CloudUploadOutlined, GlobalOutlined, FileImageOutlined, FileZipOutlined, DatabaseOutlined } from "@ant-design/icons";
import DataGallery from "./DataGallery";

const MiniSatelliteMap = lazy(() => import("./MiniSatelliteMap"));

const UploadIllustration = () => (
  <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl bg-white p-8 shadow-sm">
    <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-5xl text-[#1B5E35] ring-8 ring-emerald-50/50">
      <CloudUploadOutlined />
    </div>
    <div className="flex w-full max-w-sm flex-col gap-3">
      {/* GeoTIFF Upload */}
      <div className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <FileImageOutlined className="text-2xl text-blue-500" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-700">orthomosaic.tif</div>
          <div className="mt-1 text-xs font-medium text-gray-400">GeoTIFF • 1.2 GB</div>
        </div>
        <div className="text-xs font-bold text-[#1B5E35]">DONE</div>
      </div>
      
      {/* Raw Imagery ZIP Upload */}
      <div className="flex items-center gap-4 rounded-lg border border-emerald-100 bg-[#E8F3EB]/50 p-4">
        <FileZipOutlined className="text-2xl text-amber-500" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-700">raw_drone_images.zip</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white">
            <div className="h-full w-[68%] bg-[#1B5E35] rounded-full"></div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-xs font-bold text-[#1B5E35]">68%</div>
          <div className="text-[10px] text-gray-500">ODM Processing</div>
        </div>
      </div>
    </div>
  </div>
);

const DeferredMiniSatelliteMap = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px 0px" },
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {isVisible ? (
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-gray-100" />}>
          <MiniSatelliteMap />
        </Suspense>
      ) : (
        <div className="h-full w-full animate-pulse bg-gray-100" />
      )}
    </div>
  );
};

const HowItWorks = () => {
  return (
    <section className="w-full bg-[#F8FAF9] border-t border-slate-200/50 py-24 md:py-32">
      <div className="m-auto max-w-6xl px-4 md:px-8">
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
              Upload your high-resolution drone imagery of forests (resolution &lt; 10 cm) via your user profile. <strong>All forest data is valuable</strong>, whether it contains standing deadwood or healthy trees. We support direct uploads of finished <strong>orthophotos (GeoTIFF)</strong> as well as <strong>raw drone imagery (ZIP)</strong>. For raw images, our pipeline automatically generates orthomosaics using OpenDroneMap (ODM).
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
          <div className="flex justify-center">
            <Link to="/dataset">
              <Button size="large" icon={<DatabaseOutlined />}>
                Browse Dataset Archive
              </Button>
            </Link>
          </div>
        </div>

        {/* Step 3: Satellite Upscaling */}
        <div className="flex flex-col items-center gap-10 md:flex-row lg:gap-20">
          <div className="w-full flex-1">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5 bg-gray-100">
              <DeferredMiniSatelliteMap />
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
    </section>
  );
};

export default HowItWorks;
