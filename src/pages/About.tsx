import { Typography, Button, Card, Tabs, Collapse } from "antd";
import { useNavigate } from "react-router-dom";
import { ArrowLeftOutlined, ExportOutlined } from "@ant-design/icons";
import { usePresentations } from "../hooks/usePresentations";
import { usePublications } from "../hooks/usePublications";
import { useMemo } from "react";
import LogoBannerBand from "../components/Home/LogoBanner";
import { useData } from "../hooks/useDataProvider";
import { useState, useEffect } from "react";

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

export default function About() {
  const navigate = useNavigate();
  const { data: publications, isLoading: isLoadingPublications } = usePublications();
  const { data: presentations, isLoading: isLoadingPresentations } = usePresentations();
  const { collaborators } = useData();
  console.log("collaborators:", collaborators);

  const today = new Date();

  const contributions = useMemo(() => {
    if (!presentations) return { upcoming: [], past: [] };

    return presentations.reduce(
      (acc, presentation) => {
        const presentationDate = new Date(presentation.date);
        const item = {
          title: presentation.title,
          event: presentation.event,
          date: new Date(presentation.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          link: presentation.url,
        };

        if (presentationDate > today) {
          acc.upcoming.push(item);
        } else {
          acc.past.push(item);
        }

        return acc;
      },
      { upcoming: [], past: [] },
    );
  }, [presentations]);

  const [displayedCollaborators, setDisplayedCollaborators] = useState<Array<any>>([]);

  useEffect(() => {
    if (!collaborators?.length) return;

    shuffleCollaborators();

    const interval = setInterval(shuffleCollaborators, 5000);

    return () => clearInterval(interval);

    function shuffleCollaborators() {
      const shuffled = [...collaborators].sort(() => Math.random() - 0.5);
      setDisplayedCollaborators(shuffled.slice(0, 20));
    }
  }, [collaborators]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Introduction Section */}
      {/* if on mobile add a button to go back to home use tailwind */}
      <div className="md:hidden">
        <Button className="mb-8" type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </div>

      <div className="mb-16">
        <div className="flex items-center gap-3">
          <Title level={1} className="m-0">
            About deadtrees.earth
          </Title>
        </div>
        <Paragraph className="mt-6 text-lg text-gray-600">
          deadtrees.earth is an open-access, dynamic database revolutionizing the way we map and analyze global tree
          mortality patterns. By combining aerial imagery, Earth observation data, and machine learning, we're creating
          a comprehensive platform that brings together drone-based, airplane, and satellite imagery from contributors
          worldwide to understand tree mortality dynamics.
        </Paragraph>
        <Paragraph className="mt-4 text-base text-gray-600">
          This initiative is being led by Prof. Dr. Teja Kattenborn from{" "}
          <a href="https://geosense.uni-freiburg.de/en">geosense</a> and Clemens Mosig from{" "}
          <a href="https://rsc4earth.de/">RSC4Earth</a> / <a href="https://scads.ai/">ScaDS.AI</a>, and the service is
          being built by <a href="https://hydrocode.de/home">hydrocode</a>.
        </Paragraph>
        {/* <div className="mt-6 flex gap-4">
                    <Button type="primary" size="large" onClick={() => navigate("/dataset")}>
                        Explore the Database
                    </Button>
                    <Button size="large" onClick={() => navigate("/profile")}>
                        Contribute Data
                    </Button>
                </div> */}
      </div>
      {/* Publications Section */}
      <div className="mb-16">
        <Title level={2}>Publications</Title>
        <Paragraph className="mb-8 text-gray-600">
          Our work has been featured in various peer-reviewed journals and preprints, advancing the understanding of
          forest dieback and global tree mortality mapping.
        </Paragraph>
        {isLoadingPublications ? (
          <div>Loading...</div>
        ) : publications && publications.length > 0 ? (
          publications.map((pub, index) => (
            <Card key={index} className="mb-4">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="w-full sm:w-auto">
                  <Text strong className="block">
                    {pub.title}
                  </Text>
                  <Text type="secondary" className="block">
                    {pub.authors}
                  </Text>
                  <Text type="secondary" className="block">
                    {pub.publisher}, {pub.year}
                  </Text>
                </div>
                <Button type="link" icon={<ExportOutlined />} href={pub.url} target="_blank">
                  View Paper
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div>No publications available</div>
        )}
      </div>
      {/* Contributions Section */}
      <div className="mb-16">
        <Title level={2}>Conference Contributions</Title>
        <Tabs defaultActiveKey="upcoming">
          <TabPane tab="Upcoming" key="upcoming">
            {isLoadingPresentations ? (
              <div>Loading...</div>
            ) : contributions.upcoming.length > 0 ? (
              contributions.upcoming.map((contribution, index) => (
                <Card key={index} className="mb-4">
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                    <div className="w-full sm:w-auto">
                      <Text strong className="block">
                        {contribution.title}
                      </Text>
                      <Text type="secondary" className="block">
                        {contribution.date}
                      </Text>
                      <Text type="secondary" className="block">
                        {contribution.event}
                      </Text>
                    </div>
                    <Button type="link" icon={<ExportOutlined />} href={contribution.link} target="_blank">
                      View Details
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div>No upcoming presentations</div>
            )}
          </TabPane>
          <TabPane tab="Past" key="past">
            {isLoadingPresentations ? (
              <div>Loading...</div>
            ) : contributions.past.length > 0 ? (
              contributions.past.map((contribution, index) => (
                <Card key={index} className="mb-4">
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                    <div className="w-full sm:w-auto">
                      <Text strong className="block">
                        {contribution.title}
                      </Text>
                      <Text type="secondary" className="block">
                        {contribution.date}
                      </Text>
                      <Text type="secondary" className="block">
                        {contribution.event}
                      </Text>
                    </div>
                    <Button type="link" icon={<ExportOutlined />} href={contribution.link} target="_blank">
                      View Details
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div>No past presentations</div>
            )}
          </TabPane>
        </Tabs>
      </div>
      {/* Mission Section */}
      <Card className="mb-16 bg-slate-100 text-white">
        <Title level={2} className="text-white">
          A Glimpse into Our Mission
        </Title>
        <Paragraph className="text-gray-600">
          As global tree mortality rates continue to rise, understanding the complex drivers behind this phenomenon
          becomes increasingly crucial. deadtrees.earth leverages cutting-edge technology to fill critical knowledge
          gaps by integrating crowd-sourced aerial images, Earth Observation data, and artificial intelligence.
        </Paragraph>
        <Paragraph className="text-gray-600">
          Our platform serves as a central hub for researchers, conservationists, and citizen scientists to contribute
          and analyze data, fostering a collaborative approach to understanding and addressing the challenges of forest
          dieback in the face of climate change.
        </Paragraph>
        <Paragraph className="text-gray-600">
          We are always looking for new contributors to join our project. If you have high-resolution (&lt;20cm)
          orthoimagery and optionally any labels for standing deadwood, we would be excited to have you collaborate with
          us on this project.
        </Paragraph>
        {/* get in contact with us */}
        <div className="mt-4 text-center"></div>
        <Button
          className="mb-8 mt-4"
          type="primary"
          href="mailto:teja.kattenborn@geosense.uni-freiburg.de;janusch.jehle@felis.uni-freiburg.de;clemens.mosig@uni-leipzig.de?subject=deadtrees.earth collaboration"
        >
          Get in Contact
        </Button>

        <Collapse
          bordered={false}
          style={{ backgroundColor: "transparent" }}
          className="mt-0"
          items={[
            {
              key: "1",
              label: <span className="m-0 pt-4 text-lg text-gray-500">Want to see all contributors?</span>,
              children: (
                <div>
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
                marginBottom: "12px",
                paddingLeft: "12px",
                paddingRight: "12px",
                paddingTop: "8px",
                paddingBottom: "8px",
                backgroundColor: "rgb(241 245 249)",
              },
            },
          ]}
        />
      </Card>
      <LogoBannerBand />
    </div>
  );
}
