import { Button, Card } from "antd";
import { useNavigate } from "react-router-dom";
import { ExportOutlined } from "@ant-design/icons";
import { usePresentations } from "../../hooks/usePresentations";
import { useMemo } from "react";
import { Typography } from "antd";

const { Text } = Typography;

interface Contribution {
  title: string;
  event: string;
  date: string;
  link: string;
}

const UpcomingConferences = () => {
  const { data: presentations, isLoading } = usePresentations();
  const navigate = useNavigate();
  const today = new Date();

  const upcomingContributions = useMemo(() => {
    if (!presentations) return [];

    return presentations
      .reduce((acc: Contribution[], presentation) => {
        const presentationDate = new Date(presentation.date);
        if (presentationDate > today) {
          acc.push({
            title: presentation.title,
            event: presentation.event,
            date: new Date(presentation.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            link: presentation.url,
          });
        }
        return acc;
      }, [])
      .slice(0, 2); // Only show the next 2 upcoming conferences
  }, [presentations]);

  if (isLoading) return null;
  if (!upcomingContributions.length) return null;

  return (
    <div className="mt-16">
      <p className="text-center text-sm font-medium uppercase text-gray-500">Upcoming Conferences</p>
      <div className="m-auto mt-4 max-w-4xl space-y-3">
        {upcomingContributions.map((contribution, index) => (
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
        ))}
      </div>
      <div className="mt-4 text-center">
        <Button
          type="link"
          className="mt-4"
          onClick={() => {
            window.scrollTo(0, 0);
            navigate("/about");
          }}
        >
          Learn more about us →
        </Button>
      </div>
    </div>
  );
};

const GetInContact = () => {
  const navigate = useNavigate();

  return (
    <div className="m-auto mt-48 max-w-6xl rounded-xl bg-slate-100 p-8">
      <p className="m-0 text-center text-3xl font-semibold text-gray-800 md:text-4xl">Want to join?</p>
      <p className="m-auto max-w-3xl pt-8 text-center text-lg text-gray-500">
        {`Do you have high-resolution (<20cm) orthoimagery and `}
        <em>optionally</em>
        {` any labels for standing deadwood? We'd be excited to have you collaborate with us on this project.`}
      </p>
      <div className="flex justify-center space-x-4 pt-8">
        <Button className="hidden md:block" type="primary" size="large" onClick={() => navigate("/profile")}>
          Upload imagery
        </Button>
        <Button
          className="mt-0"
          size="large"
          href="mailto:teja.kattenborn@geosense.uni-freiburg.de;janusch.jehle@felis.uni-freiburg.de;clemens.mosig@uni-leipzig.de?subject=deadtrees.earth collaboration"
        >
          Get in touch
        </Button>
      </div>

      <UpcomingConferences />
    </div>
  );
};

export default GetInContact;
