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
    <span className={`m-0 pt-4 text-lg ${done ? "text-gray-400 line-through decoration-gray-300" : "text-gray-600"}`}>
      {label}
    </span>
  );
};

const Roadmap = () => {
  return (
    <div className="m-auto flex max-w-4xl flex-col pt-24 md:flex-row">
      <div className="mb-8 text-center md:text-left">
        <p className="m-auto text-2xl font-semibold text-green-800 md:mt-0">OUR ROADMAP</p>
        <p className="text-lg text-gray-600">Our vision and goals for the future</p>
      </div>
      <Timeline
        mode="left"
        items={[
          {
            label: RoadmapItemDate({ date: "2026 QX" }),
            color: "#FFB31C",
            children: <RoadmapItemLabel label="Satellite predictions of forest & deadwood cover at global scale" />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q3", done: true }),
            color: "green",
            children: <RoadmapItemLabel label="Satellite predictions of forest & deadwood cover at EU scale" done />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q3", done: true }),
            color: "green",
            children: <RoadmapItemLabel label="Web-labelling & feedback" done />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q3", done: true }),
            color: "green",
            children: <RoadmapItemLabel label="AI-ready datasets and community model integration" done />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q3", done: true }),
            color: "green",
            children: <RoadmapItemLabel label="Automated orthomosaic generation with ODM (OpenDroneMap)" done />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q2", done: true }),
            color: "green",
            children: <RoadmapItemLabel label="Repository functionality (long-term storage + DOI generation)" done />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q1", done: true }),
            color: "green",
            children: <RoadmapItemLabel label="AI segmentation of forest and deadwood cover online" done />,
          },
          {
            label: RoadmapItemDate({ date: "2025 Q1", done: true }),
            color: "green",
            children: <RoadmapItemLabel label="Stable upload & download" done />,
          },
          {
            label: RoadmapItemDate({ date: "2024 Q2", done: true }),
            color: "green",
            children: <RoadmapItemLabel label="Deadtrees.earth beta launch" done />,
          },
        ]}
      />
    </div>
  );
};

export default Roadmap;
