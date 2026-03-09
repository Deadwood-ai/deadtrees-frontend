import { useState, useMemo, useCallback } from "react";
import { Button, Card, Input, Typography, notification } from "antd";
import { useNavigate } from "react-router-dom";
import { ExportOutlined } from "@ant-design/icons";
import { usePresentations } from "../../hooks/usePresentations";
import { supabase } from "../../hooks/useSupabase";
import { Settings } from "../../config";

const { Text } = Typography;

interface Contribution {
	title: string;
	speaker?: string | null;
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
						speaker: presentation.speaker,
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
			}, []);
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
								{contribution.speaker && (
									<Text className="block text-gray-700">
										Speaker: {contribution.speaker}
									</Text>
								)}
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
	const [email, setEmail] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const addSubscriber = useCallback(async () => {
		const emailCheck = /\S+@\S+\.\S+/;
		if (!emailCheck.test(email)) {
			notification.error({
				message: "Invalid email",
				description: "Please enter a valid email address.",
				placement: "topRight",
			});
			return;
		}

		setIsSubmitting(true);
		const normalizedEmail = email.trim().toLowerCase();

		const { error: insertError } = await supabase
			.from(Settings.NEWSLETTER_TABLE)
			.insert([{ email: normalizedEmail }]);

		if (insertError) {
			if (insertError.code === "23505") {
				notification.info({
					message: "Already subscribed",
					description: "This email is already subscribed to our newsletter.",
					placement: "topRight",
				});
			} else {
				notification.error({
					message: "Error",
					description: "An error occurred while adding the subscriber.",
					placement: "topRight",
				});
				console.error("Error adding subscriber:", insertError);
			}
		} else {
			notification.success({
				message: "Thank you!",
				description: "Thank you for subscribing! You will receive updates on new features and developments.",
				placement: "topRight",
			});
			setEmail("");
		}
		setIsSubmitting(false);
	}, [email]);

	return (
		<section className="w-full bg-[#F8FAF9] border-y border-slate-200/50 py-24 md:py-32">
			<div className="m-auto max-w-6xl px-4 md:px-8">
				<div className="mb-12 text-center">
				<p className="mb-2 text-lg font-semibold uppercase tracking-wider text-[#1B5E35]">Community</p>
				<h2 className="m-0 text-4xl font-semibold text-gray-800 md:text-5xl">Join the effort</h2>
			</div>

			<div className="m-auto max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
				<div className="grid md:grid-cols-5">
					{/* Contribute — wider */}
					<div className="p-8 md:col-span-3 md:p-12">
						<p className="m-0 text-sm font-semibold uppercase tracking-wide text-[#1B5E35]">
							Share your data
						</p>
						<p className="m-0 mt-3 text-2xl font-semibold text-gray-900 md:text-3xl">
							Contribute aerial imagery
						</p>
						<p className="m-0 mt-4 max-w-lg text-base leading-relaxed text-gray-500">
							{`Upload high-resolution (<10cm) orthophotos and get automatic deadwood detection, proper attribution, and full database access. `}
							<em>Labels are optional</em> — our AI handles the rest.
						</p>
						<div className="mt-8 flex flex-wrap items-center gap-4">
							<Button
								type="primary"
								size="large"
								onClick={() => navigate("/profile")}
							>
								Start contributing
							</Button>
							<Button
								size="large"
								href="mailto:info@deadtrees.earth?subject=deadtrees.earth collaboration"
							>
								Get in touch
							</Button>
						</div>
					</div>

					{/* Newsletter — narrower, subtle left border */}
					<div className="bg-[#E8F3EB]/30 p-8 md:col-span-2 md:border-l border-slate-100 md:p-12">
						<p className="m-0 text-sm font-semibold uppercase tracking-wide text-[#1B5E35]/80">
							Newsletter
						</p>
						<p className="m-0 mt-3 text-2xl font-semibold text-gray-900">
							Stay in the loop
						</p>
						<p className="m-0 mt-4 text-base leading-relaxed text-gray-500">
							Get notified about new features and platform updates.
						</p>
						<div className="mt-8 flex flex-col gap-3">
							<Input
								size="large"
								placeholder="Enter email address"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={isSubmitting}
								onPressEnter={addSubscriber}
								className="border-slate-200"
							/>
							<Button
								onClick={addSubscriber}
								className="w-full bg-[#1B5E35] hover:bg-[#144728]"
								type="primary"
								size="large"
								loading={isSubmitting}
								disabled={isSubmitting}
							>
								Subscribe
							</Button>
						</div>
					</div>
				</div>
			</div>

			<UpcomingConferences />
			</div>
		</section>
	);
};

export default GetInContact;
