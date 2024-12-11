import { Typography, Button, Card, Tabs, Tag, Statistic, Row, Col } from "antd";
import { useNavigate } from "react-router-dom";
import { ExportOutlined } from "@ant-design/icons";
import { usePresentations } from "../hooks/usePresentations";
import { usePublications } from "../hooks/usePublications";
import { useMemo } from "react";
import LogoBannerBand from "../components/Home/LogoBanner";

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

export default function About() {
  const navigate = useNavigate();
  const { data: publications, isLoading: isLoadingPublications } = usePublications();
  const { data: presentations, isLoading: isLoadingPresentations } = usePresentations();

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Introduction Section */}
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
              <div className="flex items-start justify-between">
                <div>
                  <Text strong>{pub.title}</Text>
                  <br />
                  <Text type="secondary">{pub.authors}</Text>
                  <br />
                  <Text type="secondary">
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
                  <div className="flex items-start justify-between">
                    <div>
                      <Text strong>{contribution.title}</Text>
                      <br />
                      <Text type="secondary">{contribution.date}</Text>
                      <br />
                      <Text type="secondary">{contribution.event}</Text>
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
                  <div className="flex items-start justify-between">
                    <div>
                      <Text strong>{contribution.title}</Text>
                      <br />
                      <Text type="secondary">{contribution.date}</Text>
                      <br />
                      <Text type="secondary">{contribution.event}</Text>
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
        <Button className="mb-8 mt-4" type="primary" onClick={() => navigate("/contact")}>
          Get in Contact
        </Button>
      </Card>

      <LogoBannerBand />
    </div>
  );
}
