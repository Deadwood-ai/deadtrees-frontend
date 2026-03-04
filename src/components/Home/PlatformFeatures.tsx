import { 
  FileZipOutlined, 
  BookOutlined, 
  EditOutlined, 
  DownloadOutlined 
} from "@ant-design/icons";

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex flex-col items-start rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#E8F3EB] text-2xl text-[#1B5E35]">
      {icon}
    </div>
    <h3 className="mb-3 text-xl font-semibold text-gray-800">{title}</h3>
    <p className="text-base leading-relaxed text-gray-600 m-0">{description}</p>
  </div>
);

const PlatformFeatures = () => {
  return (
    <div className="m-auto flex w-full flex-col pt-24 md:pt-32">
      <div className="mb-12 text-center">
        <p className="mb-2 text-lg font-semibold uppercase tracking-wider text-[#1B5E35]">Capabilities</p>
        <p className="m-0 text-3xl font-semibold text-gray-800 md:text-4xl">Built for researchers</p>
      </div>
      
      <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-2 px-4">
        <FeatureCard 
          icon={<BookOutlined />}
          title="Publish & Get a DOI"
          description="Contribute your datasets to our repository to ensure long-term storage. Generate a DOI to formally cite your data in academic publications and get the credit you deserve."
        />
        <FeatureCard 
          icon={<FileZipOutlined />}
          title="Raw Drone Imagery Support"
          description="Don't have a finished orthophoto? You can simply upload your raw drone imagery in a ZIP file and our pipeline will automatically process it using OpenDroneMap (ODM)."
        />
        <FeatureCard 
          icon={<EditOutlined />}
          title="Community Labeling & Feedback"
          description="Help improve the global dataset. Use our web-based tools to flag problematic predictions, or manually edit and correct deadwood polygons directly in the browser."
        />
        <FeatureCard 
          icon={<DownloadOutlined />}
          title="AI-Ready Datasets"
          description="Access a growing database of high-resolution imagery paired with standardized annotations, perfectly formatted for training or validating your own machine learning models."
        />
      </div>
    </div>
  );
};

export default PlatformFeatures;