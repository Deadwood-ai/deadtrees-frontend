import { Timeline } from "antd";

const RoadmapItemDate = ({ date }: { date: string }) => {
  return <span className="text-xl font-semibold">{date}</span>;
};

const RoadmapItemLabel = ({ label }: { label: string }) => {
  return <span className="m-0 pt-4 text-lg text-gray-500">{label}</span>;
};

const Roadmap = () => {
  return (
    <div className="m-auto flex max-w-4xl flex-col pt-24 md:flex-row">
      <div className="mb-8 text-center md:text-left">
        <p className="m-auto text-2xl font-semibold text-blue-600 md:mt-0">OUR ROADMAP</p>
        <p className="text-lg text-gray-500">Our vision and goals for the future</p>
      </div>
      <Timeline
        mode="left"
        items={[
          {
            label: RoadmapItemDate({ date: "Q1 2025" }),
            color: "gray",
            children: <RoadmapItemLabel label="Analysis ready training data for AI models" />,
          },
          {
            label: RoadmapItemDate({ date: "Q1 2025" }),
            color: "gray",
            children: (
              <RoadmapItemLabel label="Integration of a large-scale tree mortality map using satellite data (sentinel)" />
            ),
          },
          {
            label: RoadmapItemDate({ date: "Q4 2024" }),
            color: "blue",
            children: <RoadmapItemLabel label="Automated segmentation of dead trees in airborne and drone images" />,
          },
          {
            label: RoadmapItemDate({ date: "Q3 2024" }),
            color: "blue",
            children: <RoadmapItemLabel label="Automated integration and visualisation of uploaded data" />,
          },
          {
            label: RoadmapItemDate({ date: "Q2 2024" }),
            color: "blue",
            children: (
              <RoadmapItemLabel label="Download and upload functionality of drone images and tree mortality labels" />
            ),
          },
          {
            label: RoadmapItemDate({ date: "Q2 2024" }),
            color: "blue",
            children: (
              <RoadmapItemLabel label="Public release of a beta version of the platform and start of data collection" />
            ),
          },
        ]}
      />
    </div>
  );
};

export default Roadmap;
