import { Timeline } from "antd";

const RoadmapItemDate = ({ date, done }: { date: string; done?: boolean }) => {
  return (
    <span className={`text-xl font-semibold ${done ? "text-gray-400" : "text-gray-800"}`}>
      {date}
    </span>
  );
};

const RoadmapItemLabel = ({ label, done }: { label: string; done?: boolean }) => {
  return (
    <div className={`mt-2 mb-8 rounded-lg p-5 ${done ? "bg-gray-50 border border-gray-100 text-gray-500" : "bg-white border border-[#1B5E35]/10 shadow-sm text-gray-800"}`}>
      <span className={`text-lg font-medium ${done ? "line-through decoration-gray-300" : ""}`}>
        {label}
      </span>
    </div>
  );
};

const Roadmap = () => {
  return (
    <div className="m-auto flex w-full flex-col pt-24 md:pt-32">
      <div className="mb-16 text-center">
        <p className="mb-2 text-lg font-semibold uppercase tracking-wider text-[#1B5E35]">Roadmap</p>
        <p className="m-0 text-4xl font-semibold text-gray-800 md:text-5xl">Vision and goals</p>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4">
        <Timeline
        mode="left"
        items={[
          {
            label: <RoadmapItemDate date="2026 QX" />,
            color: "#FFB31C",
            children: <RoadmapItemLabel label="Satellite predictions of forest & deadwood cover at global scale" />,
          },
          {
            label: <RoadmapItemDate date="2025 Q3" done />,
            color: "#1B5E35",
            children: <RoadmapItemLabel label="Satellite predictions of forest & deadwood cover at EU scale" done />,
          },
          {
            label: <RoadmapItemDate date="2025 Q3" done />,
            color: "#1B5E35",
            children: <RoadmapItemLabel label="Web-labelling & feedback" done />,
          },
          {
            label: <RoadmapItemDate date="2025 Q3" done />,
            color: "#1B5E35",
            children: <RoadmapItemLabel label="AI-ready datasets and community model integration" done />,
          },
          {
            label: <RoadmapItemDate date="2025 Q3" done />,
            color: "#1B5E35",
            children: <RoadmapItemLabel label="Automated orthomosaic generation with ODM (OpenDroneMap)" done />,
          },
          {
            label: <RoadmapItemDate date="2025 Q2" done />,
            color: "#1B5E35",
            children: <RoadmapItemLabel label="Repository functionality (long-term storage + DOI generation)" done />,
          },
          {
            label: <RoadmapItemDate date="2025 Q1" done />,
            color: "#1B5E35",
            children: <RoadmapItemLabel label="AI segmentation of forest and deadwood cover online" done />,
          },
          {
            label: <RoadmapItemDate date="2025 Q1" done />,
            color: "#1B5E35",
            children: <RoadmapItemLabel label="Stable upload & download" done />,
          },
          {
            label: <RoadmapItemDate date="2024 Q2" done />,
            color: "#1B5E35",
            children: <RoadmapItemLabel label="Deadtrees.earth beta launch" done />,
          },
        ]}
      />
      </div>
    </div>
  );
};

export default Roadmap;
