import { useState, useMemo } from "react";
import { Alert, Button, Tag } from "antd";
import { UploadOutlined, SearchOutlined } from "@ant-design/icons";
import ReactPlayer from "react-player";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthProvider";
import { useData } from "../../hooks/useDataProvider";
import { isDatasetViewable } from "../../utils/datasetVisibility";
import LogoBannerBand from "./LogoBanner";

const logos = [
	{ path: "assets/logos/esa.jpg" },
	{ path: "assets/logos/dfg.jpeg" },
	{ path: "assets/logos/uni-freiburg.png" },
	{ path: "RSC4Earth" },
	{ path: "assets/logos/NFDI4Earth_logo.jpg" },
	{ path: "assets/logos/scads.png" },
	{ path: "assets/logos/MLR.png" },
	{ path: "assets/logos/dlr.jpeg" },
	{ path: "assets/logos/geonadir.png" },
	{ path: "assets/logos/bmwk.jpg", height: "h-14" },
];

const StatItem = ({ value, label }: { value: string; label: string }) => (
	<div className="flex flex-col items-center md:items-start">
		<span className="text-2xl font-bold text-green-800">{value}</span>
		<span className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</span>
	</div>
);

const Hero = () => {
	const [isPlaying, setIsPlaying] = useState(false);
	const navigate = useNavigate();
	const { user } = useAuth();
	const { data, authors } = useData();

	const stats = useMemo(() => {
		if (!data) return null;
		const valid = data.filter((item) => isDatasetViewable(item));
		const countries = new Set(valid.map((d) => d.admin_level_1).filter(Boolean));
		return {
			datasets: valid.length,
			countries: countries.size,
			contributors: authors?.length ?? 0,
		};
	}, [data, authors]);

	const handleContribute = () => {
		if (user) {
			navigate("/profile");
		} else {
			navigate("/sign-in");
		}
	};

	return (
		<section className="relative flex w-full flex-col overflow-hidden md:min-h-[calc(100vh-64px)]">
			<div className="absolute inset-0 hidden bg-[radial-gradient(1000px_at_25%_35%,_var(--tw-gradient-stops))] from-emerald-100/60 via-green-50/30 to-white md:block"></div>

			<div className="relative z-10 m-auto flex max-w-[1400px] flex-1 flex-col justify-center px-4 md:px-10">
				<div className="md:hidden">
					<Alert
						message="Mobile version is limited"
						description="Please use a desktop browser for full functionality. Features like the interactive map, data visualization, and dataset uploads are optimized for desktop devices."
						type="info"
						showIcon
						closable
					/>
				</div>

				<div className="flex flex-col items-center gap-8 py-12 md:flex-row md:items-center md:gap-14 md:py-0">
					{/* Left column */}
					<div className="flex flex-1 flex-col items-center text-center md:items-start md:text-left">
						<Tag className="mb-4" color="warning">🚀 LAUNCHED</Tag>
						<h1 className="m-0 bg-gradient-to-br from-green-950 via-green-800 to-emerald-700 bg-clip-text pb-4 text-4xl font-bold text-transparent md:text-5xl lg:text-6xl">
							Help map tree mortality worldwide
						</h1>
						<p className="m-0 max-w-lg text-lg leading-relaxed text-gray-500">
							Contribute drone imagery to map standing deadwood with AI — and help build
							the training data that powers global satellite-based forest mortality monitoring.
						</p>

						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<Button
								type="primary"
								size="large"
								icon={<UploadOutlined />}
								onClick={handleContribute}
							>
								Contribute Data
							</Button>
							<Button
								size="large"
								icon={<SearchOutlined />}
								onClick={() => navigate("/dataset")}
							>
								Explore Datasets
							</Button>
						</div>

						{!user && (
							<p className="m-0 mt-3 text-sm text-gray-400">
								Sign in or create an account to start uploading.
							</p>
						)}

						{stats && (
							<div className="mt-10 flex gap-8">
								<StatItem value={stats.datasets.toLocaleString()} label="Datasets" />
								<StatItem value={String(stats.countries)} label="Countries" />
								<StatItem value={String(stats.contributors)} label="Contributors" />
							</div>
						)}
					</div>

					{/* Right column — wider to showcase the visual */}
					<div className="w-full md:w-[58%] md:flex-none">
						<div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-100 shadow-2xl ring-1 ring-black/5">
							<ReactPlayer
								url="https://data2.deadtrees.earth/assets/v1/New_Version_deadtrees_video.mp4"
								width="100%"
								height="100%"
								controls={true}
								playsinline
								loop={true}
								light="https://data2.deadtrees.earth/assets/v1/image.png"
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
					</div>
				</div>
			</div>

		{/* "Supported by" label above the white strip */}
		<div className="relative z-10 pb-2 pt-4">
			<p className="m-0 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
				Supported by
			</p>
		</div>

		{/* Logo banner in white strip */}
		<div className="relative z-10 border-t border-slate-100 bg-white/80 backdrop-blur-sm">
			<div className="m-auto max-w-[1400px] px-4 md:px-10">
				<div className="py-2 md:py-3">
					<LogoBannerBand logos={logos} title="" compact />
				</div>
			</div>
		</div>
		</section>
	);
};

export default Hero;
