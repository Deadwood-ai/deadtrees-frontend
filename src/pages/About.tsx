import { Button, Collapse, Tooltip, message, Input, Tabs } from "antd";
import { useNavigate } from "react-router-dom";
import { ArrowLeftOutlined, ExportOutlined, CopyOutlined, DownloadOutlined } from "@ant-design/icons";
import { usePresentations } from "../hooks/usePresentations";
import { usePublications } from "../hooks/usePublications";
import { useMemo } from "react";
import LogoBannerBand from "../components/Home/LogoBanner";
import { useData } from "../hooks/useDataProvider";
import ReactPlayer from "react-player";

export default function About() {
  const logos = [
    {
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
  const { authors } = useData();
  const contributorNames = useMemo(
    () => (authors || []).map((author) => author.label).sort((a, b) => a.localeCompare(b)),
    [authors]
  );

  const bibtexPreprint = String.raw`@article{mosig2026deadtrees,
title = {deadtrees.earth - An open-access and interactive database for centimeter-scale aerial imagery to uncover global tree mortality dynamics},
journal = {Remote Sensing of Environment},
volume = {332},
pages = {115027},
year = {2026},
issn = {0034-4257},
doi = {https://doi.org/10.1016/j.rse.2025.115027},
url = {https://www.sciencedirect.com/science/article/pii/S0034425725004316},
author = {Clemens Mosig and Janusch Vajna-Jehle and Miguel D. Mahecha and Yan Cheng and Henrik Hartmann and David Montero and Samuli Junttila and Stéphanie Horion and Mirela Beloiu Schwenke and Michael J. Koontz and Khairul Nizam Abdul Maulud and Stephen Adu-Bredu and Djamil Al-Halbouni and Muhammad Ali and Matthew Allen and Jan Altman and Lot Amorós and Claudia Angiolini and Rasmus Astrup and Hassan Awada and Caterina Barrasso and Harm Bartholomeus and Pieter S.A. Beck and Aurora Bozzini and Joshua Braun-Wimmer and Benjamin Brede and Fabio Marcelo Breunig and Stefano Brugnaro and Allan Buras and Vicente Burchard-Levine and Jesús Julio Camarero and Anna Candotti and Luka Capuder and Erik Carrieri and Mauro Centritto and Gherardo Chirici and Myriam Cloutier and Dhemerson Conciani and KC Cushman and James W. Dalling and Phuong D. Dao and Jan Dempewolf and Martin Denter and Marcel Dogotari and Ricardo Díaz-Delgado and Simon Ecke and Jana Eichel and Anette Eltner and André Fabbri and Maximilian Fabi and Fabian Fassnacht and Matheus Pinheiro Ferreira and Fabian Jörg Fischer and Julian Frey and Annett Frick and Jose Fuentes and Selina Ganz and Matteo Garbarino and Milton García and Matthias Gassilloud and Antonio Gazol and Guillermo Gea-Izquierdo and Kilian Gerberding and Marziye Ghasemi and Francesca Giannetti and Jeffrey Gillan and Roy Gonzalez and Carl Gosper and Terry Greene and Konrad Greinwald and Stuart Grieve and André Große-Stoltenberg and Jesus Aguirre Gutierrez and Anna Göritz and Peter Hajek and David Hedding and Jan Hempel and Stien Heremans and Melvin Hernández and Marco Heurich and Eija Honkavaara and Bernhard Höfle and Robert Jackisch and Tommaso Jucker and Jesse M. Kalwij and Sebastian Kepfer-Rojas and Pratima Khatri-Chhetri and Till Kleinebecker and Hans-Joachim Klemmt and Tomáš Klouček and Niko Koivumäki and Nagesh Kolagani and Jan Komárek and Kirill Korznikov and Bartłomiej Kraszewski and Stefan Kruse and Robert Krüger and Helga Kuechly and Ivan H.Y. Kwong and Etienne Laliberté and Liam Langan and Hooman Latifi and Claudia Leal-Medina and Jan R.K. Lehmann and Linyuan Li and Emily Lines and Maciej Lisiewicz and Javier Lopatin and Arko Lucieer and Antonia Ludwig and Marvin Ludwig and Päivi Lyytikäinen-Saarenmaa and Qin Ma and Nicolas Mansuy and José Manuel Peña and Giovanni Marino and Michael Maroschek and M.Pilar Martín and Darío Martín-Benito and Pavan Matham and Sabrina Mazzoni and Fabio Meloni and Annette Menzel and Hanna Meyer and Mojdeh Miraki and Gerardo Moreno and Daniel Moreno-Fernández and Helene C. Muller-Landau and Mirko Mälicke and Jakobus Möhring and Jana Müllerova and Setti Sridhara Naidu and Davide Nardi and Paul Neumeier and Mihai Daniel Nita and Roope Näsi and Lars Oppgenoorth and Sagynbek Orunbaev and Melanie Palmer and Thomas Paul and Mattis Pfenning and Alastair Potts and Gudala Laxmi Prasanna and Suzanne Prober and Stefano Puliti and Antonio J. Pérez-Luque and Oscar Pérez-Priego and Chris Reudenbach and Jesús Revuelto and Gonzalo Rivas-Torres and Philippe Roberge and Pier Paolo Roggero and Christian Rossi and Nadine Katrin Ruehr and Paloma Ruiz-Benito and Christian Mestre Runge and Gabriele Giuseppe Antonio Satta and Bruno Scanu and Michael Scherer-Lorenzen and Felix Schiefer and Christopher Schiller and Jacob Schladebach and Marie-Therese Schmehl and Jonathan Schmid and Tristan Alexander Schmidt and Selina Schwarz and Rupert Seidl and Thomas Seifert and Ana Seifert Barba and Elham Shafeian and Aurélie Shapiro and Leopoldo {de Simone} and Hormoz Sohrabi and Salim Soltani and Laura Sotomayor and Ben Sparrow and Benjamin S.C. Steer and Matt Stenson and Benjamin Stöckigt and Yanjun Su and Juha Suomalainen and Elisa Tamudo and Mauro J. Tognetti Barbieri and Enrico Tomelleri and Michele Torresani and Katerina Trepekli and Saif Ullah and Sami Ullah and Josefine Umlauft and Nicolás Vargas-Ramírez and Can Vatandaslar and Vladimir Visacki and Michele Volpi and Vicente Vásquez and Christine Wallis and Ben Weinstein and Hannah Weiser and Serge Wich and Tagle Casapia Ximena and Pablo J. Zarco-Tejada and Katherine Zdunic and Katarzyna Zielewska-Büttner and Raquel Alves {de Oliveira} and Liz {van Wagtendonk} and Vincent {von Dosky} and Teja Kattenborn},
keywords = {Orthophoto, Drone, Tree mortality, Remote sensing, Database, Citizen science, Forests, Open-access},
abstract = {Excessive tree mortality is a global concern and remains poorly understood as it is a complex phenomenon. We lack global and temporally continuous coverage on tree mortality data. Ground-based observations on tree mortality, e.g., derived from national inventories, are very sparse, and may not be standardized or spatially explicit. Earth observation data, combined with supervised machine learning, offer a promising approach to map overstory tree mortality in a consistent manner over space and time. However, global-scale machine learning requires broad training data covering a wide range of environmental settings and forest types. Low altitude observation platforms (e.g., drones or airplanes) provide a cost-effective source of training data by capturing high-resolution orthophotos of overstory tree mortality events at centimeter-scale resolution. Here, we introduce deadtrees.earth, an open-access platform hosting more than two thousand centimeter-resolution orthophotos, covering more than 1,000,000 ha, of which more than 58,000 ha are manually annotated with live/dead tree classifications. This community-sourced and rigorously curated dataset can serve as a comprehensive reference dataset to uncover tree mortality patterns from local to global scales using space-based Earth observation data and machine learning models. This will provide the basis to attribute tree mortality patterns to environmental changes or project tree mortality dynamics to the future. The open nature of deadtrees.earth, together with its curation of high-quality, spatially representative, and ecologically diverse data will continuously increase our capacity to uncover and understand tree mortality dynamics.}
}`;

  const apaCitation = `Mosig, C., Vajna-Jehle, J., Mahecha, M. D., Cheng, Y., Hartmann, H., Montero, D., Junttila, S., Horion, S., Schwenke, M. B, ... & Kattenborn, T. (2026). deadtrees. earth - An open-access and interactive database for centimeter-scale aerial imagery to uncover global tree mortality dynamics. Remote Sensing of Environment, 332, 115027.`;

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
    <div className="w-full bg-[#F8FAF9] pb-24 pt-12 md:pt-24">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        {/* Mobile Back Button */}
        <div className="mb-8 md:hidden">
          <Button type="default" icon={<ArrowLeftOutlined />} onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>

        {/* Header & Video */}
        <div className="mb-20 text-center">
          <p className="mb-2 text-lg font-semibold uppercase tracking-wider text-[#1B5E35]">About</p>
          <h1 className="m-0 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
            The Initiative
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-600">
            deadtrees.earth is an open-access, dynamic database revolutionizing the way we map and analyze global tree
            mortality patterns. By combining aerial imagery, Earth observation data, and machine learning, we're creating
            a comprehensive platform that brings together drone-based, airplane, and satellite imagery from contributors
            worldwide to understand tree mortality dynamics.
          </p>
        </div>

        <div className="relative mx-auto my-12 aspect-video w-full max-w-4xl overflow-hidden rounded-3xl bg-gray-100 shadow-xl ring-1 ring-black/5">
          <ReactPlayer
            url="https://www.youtube.com/watch?v=IKbFopiTcWY"
            width="100%"
            height="100%"
            controls={true}
            playsinline
            config={{
              youtube: {
                playerVars: {
                  modestbranding: 1,
                  rel: 0
                }
              }
            }}
          />
        </div>

        {/* Team & Contributors */}
        <div className="mx-auto mb-24 max-w-3xl text-center">
          <p className="text-lg leading-relaxed text-gray-600">
            This initiative is being led by Prof. Dr. Teja Kattenborn from{" "}
            <a href="https://geosense.uni-freiburg.de/en" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1B5E35] hover:underline">geosense</a> and Clemens Mosig from{" "}
            <a href="https://rsc4earth.de/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1B5E35] hover:underline">RSC4Earth</a> / <a href="https://scads.ai/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1B5E35] hover:underline">ScaDS.AI</a>, and the service is
            being built by Janusch Vajna-Jehle from <a href="https://geosense.uni-freiburg.de/en" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1B5E35] hover:underline">geosense</a> and{" "}
            <a href="https://hydrocode.de/home" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1B5E35] hover:underline">hydrocode</a>. deadtrees.earth would not be possible without the numerous
            collaborators and data contributors of more than 60 institutions.
          </p>
          <div className="mt-8">
            <Collapse
              bordered={false}
              style={{ backgroundColor: "transparent" }}
              className="mx-auto max-w-2xl"
              items={[
                {
                  key: "1",
                  label: <span className="text-base font-semibold text-gray-700">View all contributors</span>,
                  children: (
                    <div className="text-left text-sm leading-relaxed text-gray-600">
                      {contributorNames.length > 0 ? contributorNames.join(", ") : "Loading contributors..."}
                    </div>
                  ),
                  style: {
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  },
                },
              ]}
            />
          </div>
        </div>

        {/* How to cite */}
        <div className="mx-auto mb-24 max-w-4xl">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">How to cite</h2>
          <p className="mb-8 text-lg text-gray-600">
            If you use datasets from deadtrees.earth, please cite each dataset by its DOI. You can find the DOI on the
            dataset page (look for the DOI badge and link).
          </p>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
              <h3 className="mb-6 text-xl font-semibold text-gray-900">1) Database (drone products)</h3>
              
              <div className="mb-8">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-500">BibTeX</span>
                  <Tooltip title="Copy BibTeX">
                    <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopy(bibtexPreprint)}>
                      Copy
                    </Button>
                  </Tooltip>
                </div>
                <Input.TextArea
                  readOnly
                  value={bibtexPreprint}
                  autoSize={{ minRows: 4, maxRows: 12 }}
                  className="font-mono text-xs bg-slate-50 text-slate-700 rounded-lg p-4 custom-scrollbar"
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-500">APA</span>
                  <Tooltip title="Copy APA">
                    <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopy(apaCitation)}>
                      Copy
                    </Button>
                  </Tooltip>
                </div>
                <Input.TextArea
                  readOnly
                  value={apaCitation}
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  className="font-mono text-sm bg-slate-50 text-slate-700 rounded-lg p-4 custom-scrollbar"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
              <h3 className="mb-3 text-xl font-semibold text-gray-900">2) Segmentation model</h3>
              <p className="text-base text-gray-600 m-0">
                For deadwood segmentation predictions, please cite{" "}
                <a
                  href="https://www.sciencedirect.com/science/article/pii/S2667393225000237"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#1B5E35] hover:underline"
                >
                  Mohring et al., 2025 (ISPRS Open Journal of Photogrammetry and Remote Sensing)
                </a>
                .
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
              <h3 className="mb-3 text-xl font-semibold text-gray-900">3) Satellite products (Sentinel maps)</h3>
              <p className="text-base text-gray-600 m-0">
                For the satellite products shown in the DeadTrees map, please cite{" "}
                <a href="https://eartharxiv.org/repository/view/11912/" target="_blank" rel="noopener noreferrer" className="font-medium text-[#1B5E35] hover:underline">
                  Mosig et al., 2026 (EarthArXiv preprint)
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Publications */}
        <div className="mx-auto mb-24 max-w-4xl">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">Publications</h2>
          <p className="mb-8 text-lg text-gray-600">
            Our work has been featured in various peer-reviewed journals and preprints, advancing the understanding of
            forest dieback and global tree mortality mapping.
          </p>

          <div className="space-y-4">
            {isLoadingPublications ? (
              <div className="text-gray-500">Loading...</div>
            ) : publications && publications.length > 0 ? (
              publications.map((pub, index) => (
                <div key={index} className="flex flex-col items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md sm:flex-row">
                  <div className="flex-1">
                    <h4 className="mb-1 text-lg font-semibold text-gray-900">{pub.title}</h4>
                    <p className="mb-2 text-sm text-gray-600">{pub.authors}</p>
                    <p className="m-0 text-sm font-medium text-gray-500">
                      {pub.publisher}, {pub.year}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
                    <Button icon={<ExportOutlined />} href={pub.url} target="_blank">
                      View Paper
                    </Button>
                    {pub.data_url && (
                      <Button icon={<DownloadOutlined />} href={pub.data_url} target="_blank">
                        Data Link
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 rounded-xl border border-gray-200 bg-white p-6">No publications available</div>
            )}
          </div>
        </div>

        {/* Conference Contributions */}
        <div className="mx-auto mb-24 max-w-4xl">
          <h2 className="mb-8 text-3xl font-bold tracking-tight text-gray-900">Conference Contributions</h2>
          <Tabs 
            defaultActiveKey="upcoming"
            items={[
              {
                key: "upcoming",
                label: "Upcoming",
                children: isLoadingPresentations ? (
                  <div className="text-gray-500 py-4">Loading...</div>
                ) : contributions.upcoming.length > 0 ? (
                  <div className="space-y-4 py-4">
                    {contributions.upcoming.map((contribution, index) => (
                      <div key={index} className="flex flex-col items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md sm:flex-row">
                        <div className="flex-1">
                          <h4 className="mb-1 text-lg font-semibold text-gray-900">{contribution.title}</h4>
                          <p className="mb-2 text-sm font-medium text-[#1B5E35]">{contribution.date}</p>
                          <p className="m-0 text-sm text-gray-600">{contribution.event}</p>
                        </div>
                        <Button className="shrink-0" icon={<ExportOutlined />} href={contribution.link} target="_blank">
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 py-4 rounded-xl border border-gray-200 bg-white p-6">No upcoming presentations</div>
                )
              },
              {
                key: "past",
                label: "Past",
                children: isLoadingPresentations ? (
                  <div className="text-gray-500 py-4">Loading...</div>
                ) : contributions.past.length > 0 ? (
                  <div className="space-y-4 py-4">
                    {contributions.past.map((contribution, index) => (
                      <div key={index} className="flex flex-col items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md sm:flex-row">
                        <div className="flex-1">
                          <h4 className="mb-1 text-lg font-semibold text-gray-900">{contribution.title}</h4>
                          <p className="mb-2 text-sm font-medium text-[#1B5E35]">{contribution.date}</p>
                          <p className="m-0 text-sm text-gray-600">{contribution.event}</p>
                        </div>
                        <Button className="shrink-0" icon={<ExportOutlined />} href={contribution.link} target="_blank">
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 py-4 rounded-xl border border-gray-200 bg-white p-6">No past presentations</div>
                )
              }
            ]}
          />
        </div>

        {/* Mission / Call to Action */}
        <div className="mx-auto mb-24 max-w-4xl overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50/50 shadow-sm">
          <div className="p-10 text-center md:p-14">
            <h2 className="mb-8 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              A Glimpse into Our Mission
            </h2>
            <div className="mx-auto max-w-2xl space-y-6 text-lg text-gray-600 leading-relaxed">
              <p>
                As global tree mortality rates continue to rise, understanding the complex drivers behind this phenomenon
                becomes increasingly crucial. deadtrees.earth leverages cutting-edge technology to fill critical knowledge
                gaps by integrating crowd-sourced aerial images, Earth Observation data, and artificial intelligence.
              </p>
              <p>
                Our platform serves as a central hub for researchers, conservationists, and citizen scientists to contribute
                and analyze data, fostering a collaborative approach to understanding and addressing the challenges of forest
                dieback in the face of climate change.
              </p>
              <p className="font-medium text-gray-900">
                We are always looking for new contributors to join our project. If you have high-resolution (&lt;10cm)
                orthoimagery and optionally any labels for standing deadwood, we would be excited to have you collaborate with
                us on this project.
              </p>
            </div>
            <div className="mt-12">
              <Button
                type="primary"
                size="large"
                className="h-12 px-8 text-base font-semibold shadow-sm"
                href="mailto:info@deadtrees.earth?subject=deadtrees.earth collaboration"
              >
                Get in Contact
              </Button>
            </div>
          </div>
        </div>

        {/* Partners Banner */}
        <div className="mt-12 rounded-3xl border border-gray-200 bg-white py-12 text-center shadow-sm">
          <LogoBannerBand logos={logos} title="Research Networks and associated partners" />
        </div>
      </div>
    </div>
  );
}
