import { Timeline } from "antd";

const RoadmapItemDate = ({ date }: { date: string }) => {
  return <span className="text-xl font-semibold text-gray-800">{date}</span>;
};

const RoadmapItemLabel = ({ label }: { label: string }) => {
  return <span className="m-0 pt-4 text-lg text-gray-600">{label}</span>;
};

const Roadmap = () => {
  return (
    <div className="m-auto flex max-w-4xl flex-col pt-24 md:flex-row">
      <div className="mb-8 text-center md:text-left">
        <p className="m-auto text-2xl font-semibold text-blue-600 md:mt-0">OUR ROADMAP</p>
        <p className="text-lg text-gray-600">Our vision and goals for the future</p>
      </div>
      <Timeline
        mode="left"
        items={[
          {
            label: RoadmapItemDate({ date: "2026 QX" }),
            color: "gray",
            children: <RoadmapItemLabel label="Satellite predictions of forest & deadwood cover at global scale" />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q3" }),
            color: "gray",
            children: <RoadmapItemLabel label="Satellite predictions of forest & deadwood cover at EU scale" />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q3" }),
            color: "gray",
            children: <RoadmapItemLabel label="Web-labelling & feedback" />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q3" }),
            color: "gray",
            children: <RoadmapItemLabel label="AI-ready datasets and community model integration" />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q3" }),
            color: "blue",
            children: <RoadmapItemLabel label="Automated orthomosaic generation with ODM (OpenDroneMap)" />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q2" }),
            color: "blue",
            children: <RoadmapItemLabel label="Repository functionality (long-term storage + DOI generation)" />,
          },
          {
            label: RoadmapItemDate({ date: "2025-Q1" }),
            color: "blue",
            children: <RoadmapItemLabel label="AI segmentation of forest and deadwood cover online" />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q1" }),
            color: "blue",
            children: <RoadmapItemLabel label="Stable upload & download" />,
          },
          {
            label: RoadmapItemDate({ date: "2024 Q2" }),
            color: "blue",
            children: <RoadmapItemLabel label="Deadtrees.earth beta launch" />,
          },
        ]}
      />
    </div>
  );
};

export default Roadmap;
