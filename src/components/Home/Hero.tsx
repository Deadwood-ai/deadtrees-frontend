import { useState, useMemo, useEffect, useCallback } from "react";
import { Alert, Button } from "antd";
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

const heroVideoConfig = {
	file: {
		attributes: {
			controlsList: "nodownload",
		},
	},
};

// Prevent duplicate count-up in React StrictMode remounts (dev)
const animatedStatKeys = new Set<string>();

const AnimatedStat = ({ value, label }: { value: number; label: string }) => {
	const [displayValue, setDisplayValue] = useState(0);
	const duration = 2000; // 2 seconds animation

	useEffect(() => {
		if (animatedStatKeys.has(label)) {
			setDisplayValue(value);
			return;
		}
		animatedStatKeys.add(label);

		let startTime: number | null = null;
		let animationFrame: number;

		const animate = (timestamp: number) => {
			if (!startTime) startTime = timestamp;
			const progress = timestamp - startTime;

			// Easing function (easeOutExpo)
			const easeProgress = 1 - Math.pow(2, -10 * (progress / duration));

			if (progress < duration) {
				setDisplayValue(Math.floor(easeProgress * value));
				animationFrame = requestAnimationFrame(animate);
			} else {
				setDisplayValue(value);
			}
		};

		animationFrame = requestAnimationFrame(animate);

		return () => cancelAnimationFrame(animationFrame);
	}, [value, label]);

	return (
		<div className="flex items-baseline gap-1.5">
			<span className="text-xl font-bold text-[#FFB31C]">
				{displayValue.toLocaleString()}
			</span>
			<span className="text-sm font-medium text-gray-500">{label}</span>
		</div>
	);
};

const Hero = () => {
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

	const handleContribute = useCallback(() => {
		if (user) {
			navigate("/profile");
		} else {
			navigate("/sign-in");
		}
	}, [navigate, user]);

	const handleExploreMap = useCallback(() => {
		navigate("/deadtrees");
	}, [navigate]);

	return (
		<section className="relative flex w-full flex-col overflow-hidden md:min-h-[calc(100vh-64px)]">
			<div className="absolute inset-0 hidden bg-[radial-gradient(1000px_at_25%_35%,_var(--tw-gradient-stops))] from-emerald-100/60 via-green-50/30 to-white md:block"></div>

			<div className="relative z-10 m-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-4 md:px-10">
				<div className="md:hidden">
					<Alert
						message="Mobile version is limited"
						description="Please use a desktop browser for full functionality. Features like the interactive map, data visualization, and dataset uploads are optimized for desktop devices."
						type="info"
						showIcon
						closable
					/>
				</div>

				<div className="w-full flex flex-col gap-12 py-12 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:py-0">
					{/* Left column */}
					<div className="flex flex-col items-center text-center lg:w-[42%] lg:items-start lg:text-left shrink-0">
						<div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[#FFB31C]/40 bg-[#FFF4D9]/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-[#AE5920]">
							<span className="text-sm">🚀</span>
							<span>Platform Live</span>
						</div>
						<h1 className="m-0 bg-gradient-to-br from-green-950 via-green-800 to-emerald-700 bg-clip-text pb-6 text-4xl font-bold leading-tight text-transparent md:text-5xl lg:text-6xl xl:text-[4rem]">
							Mapping global tree mortality
						</h1>
						<p className="m-0 max-w-lg text-lg leading-relaxed text-gray-500">
							Contribute drone imagery of forests to help monitor tree mortality and forest health using AI. All forest data is valuable and powers the next generation of global satellite models.
						</p>

						<div className="mt-10 flex flex-col gap-4 sm:flex-row">
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
								onClick={handleExploreMap}
							>
								Explore Map
							</Button>
						</div>

						{!user && (
							<p className="m-0 mt-3 text-sm text-gray-400">
								Sign in or create an account to start uploading.
							</p>
						)}

						<div className="mt-8 flex flex-wrap items-center justify-center gap-6 md:justify-start">
							<AnimatedStat value={stats?.datasets ?? 6741} label="Datasets" />
							<AnimatedStat value={stats?.countries ?? 127} label="Countries" />
							<AnimatedStat value={stats?.contributors ?? 668} label="Contributors" />
						</div>
					</div>

					{/* Right column — visual */}
					<div className="mt-8 flex w-full justify-center lg:mt-0 lg:w-[58%] lg:justify-end">
						<div className="relative aspect-video w-full max-w-[1120px] overflow-hidden rounded-2xl bg-gray-100 shadow-2xl ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]">
							<ReactPlayer
								url="https://data2.deadtrees.earth/assets/v1/New_Version_deadtrees_video.mp4"
								width="100%"
								height="100%"
								controls={true}
								playsinline
								loop={true}
								light="https://data2.deadtrees.earth/assets/v1/image.png"
								config={heroVideoConfig}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* "Supported by" section */}
			<div className="relative z-10 mt-auto pt-16">
				<p className="m-0 pb-4 text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
					Supported by
				</p>

				{/* Logo banner in white strip */}
				<div className="border-t border-slate-100 bg-white/90 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] backdrop-blur-md">
					<div className="m-auto max-w-[1640px] px-4 md:px-10">
						<div className="py-4 md:py-6">
							<LogoBannerBand logos={logos} title="" compact />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Hero;
