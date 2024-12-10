import { Typography, Button, Card, Tabs, Tag, Statistic, Row, Col } from "antd";
import { useNavigate } from "react-router-dom";
import { ExportOutlined } from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

const publications = [
    {
        title: "Global patterns of tree mortality: insights from remote sensing",
        authors: "Smith, J., Johnson, M., et al.",
        journal: "Nature Climate Change",
        year: "2024",
        doi: "#"
    },
    {
        title: "Machine learning approaches for detecting forest dieback",
        authors: "Johnson, M., Williams, R., et al.",
        journal: "Remote Sensing of Environment",
        year: "2023",
        doi: "#"
    },
];

const upcomingContributions = [
    {
        title: "Mapping Global Tree Mortality Patterns",
        event: "EGU 2025",
        date: "April 15, 2025",
        link: "#"
    },
    {
        title: "AI-Driven Forest Health Monitoring",
        event: "ForestTech Conference 2025",
        date: "June 1, 2025",
        link: "#"
    },
];

const pastContributions = [
    {
        title: "Remote Sensing Applications in Forest Health",
        event: "IUFRO World Congress",
        date: "October 10, 2024",
        link: "#"
    },
    {
        title: "Crowd-sourced Data for Environmental Monitoring",
        event: "ESA Living Planet Symposium",
        date: "May 15, 2024",
        link: "#"
    },
];

const stats = [
    { value: "1000+", label: "Orthophotos" },
    { value: "40k", label: "Labeled Polygons" },
    { value: "63", label: "Countries" },
    { value: "43", label: "Institutions" },
];

export default function About() {
    const navigate = useNavigate();

    return (
        <div className="mx-auto max-w-6xl px-4 py-12">
            {/* Introduction Section */}
            <div className="mb-16">
                <div className="flex items-center gap-3">
                    <Title level={1} className="m-0">About deadtrees.earth</Title>
                </div>
                <Paragraph className="mt-6 text-lg text-gray-600">
                    deadtrees.earth is an open-access, dynamic database revolutionizing the way we map and analyze global tree mortality patterns. By combining aerial imagery, Earth observation data, and machine learning, we're creating a comprehensive platform that brings together drone-based, airplane, and satellite imagery from contributors worldwide to understand tree mortality dynamics.
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
                    Our work has been featured in various peer-reviewed journals and preprints, advancing the understanding of forest dieback and global tree mortality mapping.
                </Paragraph>
                {publications.map((pub, index) => (
                    <Card key={index} className="mb-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <Text strong>{pub.title}</Text>
                                <br />
                                <Text type="secondary">{pub.authors}</Text>
                                <br />
                                <Text type="secondary">{pub.journal}, {pub.year}</Text>
                            </div>
                            <Button type="link" icon={<ExportOutlined />} href={pub.doi} target="_blank">
                                View Paper
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Contributions Section */}
            <div className="mb-16">
                <Title level={2}>Conference Contributions</Title>
                <Tabs defaultActiveKey="upcoming">
                    <TabPane tab="Upcoming" key="upcoming">
                        {upcomingContributions.map((contribution, index) => (
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
                        ))}
                    </TabPane>
                    <TabPane tab="Past" key="past">
                        {pastContributions.map((contribution, index) => (
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
                        ))}
                    </TabPane>
                </Tabs>
            </div>

            {/* Mission Section */}
            <Card className="mb-16 bg-slate-100 text-white">
                <Title level={2} className="text-white">A Glimpse into Our Mission</Title>
                <Paragraph className="text-gray-600">
                    As global tree mortality rates continue to rise, understanding the complex drivers behind this phenomenon becomes increasingly crucial. deadtrees.earth leverages cutting-edge technology to fill critical knowledge gaps by integrating crowd-sourced aerial images, Earth Observation data, and artificial intelligence.
                </Paragraph>
                <Paragraph className="text-gray-600">
                    Our platform serves as a central hub for researchers, conservationists, and citizen scientists to contribute and analyze data, fostering a collaborative approach to understanding and addressing the challenges of forest dieback in the face of climate change.
                </Paragraph>
                {/* get in contact with us */}
                <Button className="mt-4" type="primary" onClick={() => navigate("/contact")}>
                    Get in Contact
                </Button>
            </Card>

            {/* Stats Section */}
            <Row gutter={[16, 16]}>
                {stats.map((stat, index) => (
                    <Col key={index} xs={12} sm={6}>
                        <Card>
                            <Statistic
                                value={stat.value}
                                title={stat.label}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>
        </div >
    );
} 