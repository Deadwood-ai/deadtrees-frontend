import { Typography, Button, Card, Tabs, Collapse, Tooltip, message, Input } from "antd";
import { useNavigate } from "react-router-dom";
import { ArrowLeftOutlined, ExportOutlined, CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import { usePresentations } from "../hooks/usePresentations";
import { usePublications } from "../hooks/usePublications";
import { useMemo } from "react";
import LogoBannerBand from "../components/Home/LogoBanner";
import { useData } from "../hooks/useDataProvider";
import { useState } from "react";
import ReactPlayer from "react-player";

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

export default function About() {
  const logos = [
    {
      // path: "assets/logos/copenhagen.png",
      path: "assets/logos/logo-copenhagen.svg",
      text: "Department of Geosciences and Natural Resource Management, University of Copenhagen",
      url: "https://researchprofiles.ku.dk/en/organisations/institut-for-geovidenskab-og-naturforvaltning",
    },
    {
      path: "assets/logos/ecosystem-health-observatory.jpg",
      text: "Global Ecosystem Health Observatory (GEHO), University of Easter Finland",
      url: "https://uefconnect.uef.fi/en/global-ecosystem-health-observatory-geho/",
    },
    {
      path: "assets/logos/julius-kuenen-institut.svg",
      text: "Institute for Forest Protection, Julius Kühn-Institut (JKI)",
      url: "https://www.julius-kuehn.de/en/ws",
    },
    {
      path: "assets/logos/tree-mortality-network.png",
      text: "Tree Mortality Network, International Union of Forest Research Organizations (IUFRO)",
      url: "https://www.tree-mortality.net/",
    },
    {
      path: "assets/logos/NFDI4Earth_logo.jpg",
      text: "National Research Infrastructure for the Earth System Sciences, NFDI4Earth",
      url: "https://nfdi4earth.de/",
    },
    {
      path: "assets/logos/esa.jpg",
      text: "European Space Agency",
      url: "https://www.esa.int/",
    },
    {
      path: "assets/logos/dlr.jpeg",
      text: "German Aerospace Center (DLR)",
      url: "https://ml4earth.de/",
    },
    {
      path: "assets/logos/geonadir.png",
      text: "Geonadir - Open Aerial Imagery Platform",
      url: "https://www.geonadir.com",
    },
    {
      path: "assets/logos/bmwk.jpg",
      text: "Federal Ministry for Economic Affairs and Climate Action (BMWK)",
      url: "https://ml4earth.de/",
      height: "h-24",
    },
  ];

  const navigate = useNavigate();
  const { data: publications, isLoading: isLoadingPublications } = usePublications();
  const { data: presentations, isLoading: isLoadingPresentations } = usePresentations();
  const { collaborators } = useData();
  // console.log("collaborators:", collaborators);

  const [isPlaying, setIsPlaying] = useState(false);

  const bibtexPreprint = String.raw`@article {mosig2024deadtrees,
  author = {Mosig, Clemens and Vajna-Jehle, Janusch and Mahecha, Miguel D. and Cheng, Yan and Hartmann, Henrik and Montero, David and Junttila, Samuli and Horion, St{\'e}phanie and Schwenke, Mirela Beloiu and Adu-Bredu, Stephen and Al-Halbouni, Djamil and Allen, Matthew and Altman, Jan and Angiolini, Claudia and Astrup, Rasmus and Barrasso, Caterina and Bartholomeus, Harm and Brede, Benjamin and Buras, Allan and Carrieri, Erik and Chirici, Gherardo and Cloutier, Myriam and Cushman, KC and Dalling, James W. and Dempewolf, Jan and Denter, Martin and Ecke, Simon and Eichel, Jana and Eltner, Anette and Fabi, Maximilian and Fassnacht, Fabian and Feirreira, Matheus Pinheiro and Frey, Julian and Frick, Annett and Ganz, Selina and Garbarino, Matteo and Garc{\'\i}a, Milton and Gassilloud, Matthias and Ghasemi, Marziye and Giannetti, Francesca and Gonzalez, Roy and Gosper, Carl and Greinwald, Konrad and Grieve, Stuart and Gutierrez, Jesus Aguirre and G{\"o}ritz, Anna and Hajek, Peter and Hedding, David and Hempel, Jan and Hern{\'a}ndez, Melvin and Heurich, Marco and Honkavaara, Eija and Jucker, Tommaso and Kalwij, Jesse M. and Khatri-Chhetri, Pratima and Klemmt, Hans-Joachim and Koivum{\"a}ki, Niko and Korznikov, Kirill and Kruse, Stefan and Kr{\"u}ger, Robert and Lalibert{\'e}, Etienne and Langan, Liam and Latifi, Hooman and Lehmann, Jan and Li, Linyuan and Lines, Emily and Lopatin, Javier and Lucieer, Arko and Ludwig, Marvin and Ludwig, Antonia and Lyytik{\"a}inen-Saarenmaa, P{\"a}ivi and Ma, Qin and Marino, Giovanni and Maroschek, Michael and Meloni, Fabio and Menzel, Annette and Meyer, Hanna and Miraki, Mojdeh and Moreno-Fern{\'a}ndez, Daniel and Muller-Landau, Helene C. and M{\"a}licke, Mirko and M{\"o}hring, Jakobus and M{\"u}llerova, Jana and Neumeier, Paul and N{\"a}si, Roope and Oppgenoorth, Lars and Palmer, Melanie and Paul, Thomas and Potts, Alastair and Prober, Suzanne and Puliti, Stefano and P{\'e}rez-Priego, Oscar and Reudenbach, Chris and Rossi, Christian and Ruehr, Nadine Katrin and Ruiz-Benito, Paloma and Runge, Christian Mestre and Scherer-Lorenzen, Michael and Schiefer, Felix and Schladebach, Jacob and Schmehl, Marie-Therese and Schwarz, Selina and Seidl, Rupert and Shafeian, Elham and de Simone, Leopoldo and Sohrabi, Hormoz and Sotomayor, Laura and Sparrow, Ben and Steer, Benjamin S.C. and Stenson, Matt and St{\"o}ckigt, Benjamin and Su, Yanjun and Suomalainen, Juha and Torresani, Michele and Umlauft, Josefine and Vargas-Ram{\'\i}rez, Nicol{\'a}s and Volpi, Michele and V{\'a}squez, Vicente and Weinstein, Ben and Ximena, Tagle Casapia and Zdunic, Katherine and Zielewska-B{\"u}ttner, Katarzyna and de Oliveira, Raquel Alves and van Wagtendonk, Liz and von Dosky, Vincent and Kattenborn, Teja},
  title = {deadtrees.earth - An Open-Access and Interactive Database for Centimeter-Scale Aerial Imagery to Uncover Global Tree Mortality Dynamics},
  elocation-id = {2024.10.18.619094},
  year = {2024},
  doi = {10.1101/2024.10.18.619094},
  publisher = {Cold Spring Harbor Laboratory},
  abstract = {Excessive tree mortality is a global concern and remains poorly understood as it is a complex phenomenon. We lack global and temporally continuous coverage on tree mortality data. Ground-based observations on tree mortality, e.g., derived from national inventories, are very sparse, not standardized and not spatially explicit. Earth observation data, combined with supervised machine learning, offer a promising approach to map tree mortality over time. However, global-scale machine learning requires broad training data covering a wide range of environmental settings and forest types. Drones provide a cost-effective source of training data by capturing high-resolution orthophotos of tree mortality events at sub-centimeter resolution. Here, we introduce deadtrees.earth, an open-access platform hosting more than a thousand centimeter-resolution orthophotos, covering already more than 300,000 ha, of which more than 58,000 ha are fully annotated. This community-sourced and rigorously curated dataset shall serve as a foundation for a global initiative to gather comprehensive reference data. In concert with Earth observation data and machine learning it will serve to uncover tree mortality patterns from local to global scales. This will provide the foundation to attribute tree mortality patterns to environmental changes or project tree mortality dynamics to the future. Thus, the open and interactive nature of deadtrees.earth together with the collective effort of the community is meant to continuously increase our capacity to uncover and understand tree mortality patterns.,
  URL = {https://www.biorxiv.org/content/early/2024/10/20/2024.10.18.619094.1},
  eprint = {https://www.biorxiv.org/content/early/2024/10/20/2024.10.18.619094.1.full.pdf},
  journal = {bioRxiv}
}`;

  const apaCitation = `Mosig, C., Vajna-Jehle, J., Mahecha, M. D., Cheng, Y., Hartmann, H., Montero, D., Junttila, S., Horion, S., Schwenke, M. B., Adu-Bredu, S., Al-Halbouni, D., Allen, M., Altman, J., Angiolini, C., Astrup, R., Barrasso, C., Bartholomeus, H., Brede, B., Buras, A., … Kattenborn, T. (2024). deadtrees.earth – An open-access and interactive database for centimeter-scale aerial imagery to uncover global tree mortality dynamics [Preprint]. bioRxiv. https://doi.org/10.1101/2024.10.18.619094`;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success("Copied to clipboard");
    } catch (err) {
      message.error("Copy failed");
    }
  };

  type ContributionItem = { title: string; event: string; date: string; link: string };
  const contributions = useMemo(() => {
    if (!presentations) return { upcoming: [] as ContributionItem[], past: [] as ContributionItem[] };

    const now = Date.now();
    return presentations.reduce(
      (acc: { upcoming: ContributionItem[]; past: ContributionItem[] }, presentation) => {
        const presentationTime = new Date(presentation.date).getTime();
        const item: ContributionItem = {
          title: presentation.title,
          event: presentation.event,
          date: new Date(presentation.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          link: presentation.url,
        };

        if (presentationTime > now) {
          acc.upcoming.push(item);
        } else {
          acc.past.push(item);
        }

        return acc;
      },
      { upcoming: [] as ContributionItem[], past: [] as ContributionItem[] },
    );
  }, [presentations]);

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
        <div className="relative  my-8 aspect-video w-full max-w-3xl overflow-hidden rounded-2xl bg-gray-100 md:mt-8">
          <ReactPlayer
            url="https://www.youtube.com/watch?v=IKbFopiTcWY"
            width="100%"
            height="100%"
            controls={true}
            playsinline
            loop={true}
            config={{
              file: {
                attributes: {
                  controlsList: "nodownload",
                },
              },
            }}
            playing={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
        <Paragraph className="mt-4 text-lg text-gray-600">
          This initivative is being led by Prof. Dr. Teja Kattenborn from{" "}
          <a href="https://geosense.uni-freiburg.de/en">geosense</a> and Clemens Mosig from{" "}
          <a href="https://rsc4earth.de/">RSC4Earth</a> / <a href="https://scads.ai/">ScaDS.AI</a>, and the service is
          being built by Janusch Vajna-Jehle from <a href="https://geosense.uni-freiburg.de/en">geosense</a> and{" "}
          <a href="https://hydrocode.de/home">hydrocode</a>. deadtrees.earth would not be possible without the numerous
          collaborators and data contributors of more than 60 institutions.
        </Paragraph>
        <Collapse
          bordered={false}
          style={{ backgroundColor: "transparent" }}
          className="mt-0"
          items={[
            {
              key: "1",
              label: <span className="m-0 pt-6 text-lg text-gray-500">Want to see all contributors?</span>,
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
                borderRadius: "0.5rem",
                marginBottom: "12px",
                paddingLeft: "0px",
                paddingRight: "12px",
                paddingTop: "0px",
                paddingBottom: "8px",
                // backgroundColor: "rgb(241 245 249)",
              },
            },
          ]}
        />
      </div>
      {/* How to cite Section - moved above Mission */}
      <div className="mb-16">
        <Title level={2}>How to cite</Title>
        <Paragraph className="text-gray-600">
          If you use datasets from deadtrees.earth, please cite each dataset by its DOI. You can find the DOI on the
          dataset page (look for the DOI badge and link).
        </Paragraph>
        <Title level={5} className="mt-4 text-gray-600">
          BibTeX:
        </Title>
        <div className="relative w-full">
          <Tooltip title="Copy BibTeX">
            <Button
              // type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(bibtexPreprint)}
              className="absolute right-4 top-4 z-10"
            >
              Copy
            </Button>
          </Tooltip>
          <Input.TextArea
            readOnly
            value={bibtexPreprint}
            autoSize={{ minRows: 1, maxRows: 16 }}
            className="pr-14 font-mono text-sm"
            style={{ whiteSpace: "pre", overflowX: "auto", width: "100%" }}
          />
        </div>
        <Title level={5} className="mt-4 text-gray-600">
          APA:
        </Title>
        <div className="relative w-full">
          <Tooltip title="Copy APA">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(apaCitation)}
              className="absolute right-4 top-4 z-10"
            >
              Copy
            </Button>
          </Tooltip>
          <Input.TextArea
            readOnly
            value={apaCitation}
            autoSize={{ minRows: 1, maxRows: 8 }}
            className="pr-14 font-mono text-sm"
            style={{ whiteSpace: "pre-wrap", overflowX: "auto", width: "100%" }}
          />
        </div>
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
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="link" icon={<ExportOutlined />} href={pub.url} target="_blank">
                    View Paper
                  </Button>
                  {pub.data_url && (
                    <Button type="link" icon={<DownloadOutlined />} href={pub.data_url} target="_blank">
                      Data Link
                    </Button>
                  )}
                </div>
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
          We are always looking for new contributors to join our project. If you have high-resolution (&lt;10cm)
          orthoimagery and optionally any labels for standing deadwood, we would be excited to have you collaborate with
          us on this project.
        </Paragraph>
        {/* get in contact with us */}
        <div className="mt-4 text-center"></div>
        <Button
          className="mb-8 mt-4"
          type="primary"
          href="mailto:info@deadtrees.earth?subject=deadtrees.earth collaboration"
        >
          Get in Contact
        </Button>
      </Card>
      <LogoBannerBand logos={logos} title="Research Networks and associated partners" />
    </div>
  );
}
