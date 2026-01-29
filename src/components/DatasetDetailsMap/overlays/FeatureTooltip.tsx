import { forwardRef } from "react";

interface FeatureTooltipProps {
	content: { type: string; status: string } | null;
	isLoggedIn?: boolean;
	isVisible: boolean;
}

/**
 * Minimal hover tooltip for map features
 * Shows feature type and status with a colored indicator
 */
const FeatureTooltip = forwardRef<HTMLDivElement, FeatureTooltipProps>(
	({ content, isLoggedIn = false, isVisible }, ref) => {
		return (
			<div
				ref={ref}
				className="pointer-events-none rounded bg-gray-900/90 px-2 py-1 shadow-md"
				style={{ display: isVisible && content ? "block" : "none" }}
			>
				{content && (
					<div className="flex items-center gap-1.5 text-xs whitespace-nowrap text-white">
						<span
							className="h-2 w-2 rounded-full flex-shrink-0"
							style={{
								backgroundColor:
									content.status === "original" || !content.status || content.status === "none"
										? "#F59E0B" // orange - default layer color for predictions
										: content.status === "pending"
											? "#60A5FA" // light blue - in review
											: "#34D399", // light green - verified
							}}
						/>
						<span>{content.type}</span>
						<span className="text-gray-400">·</span>
						<span className="text-gray-300">
							{content.status === "original" || !content.status || content.status === "none"
								? "Prediction"
								: content.status === "pending"
									? "Edited"
									: "Verified"}
						</span>
						{isLoggedIn && <span className="text-gray-500">· click to edit</span>}
					</div>
				)}
			</div>
		);
	}
);

FeatureTooltip.displayName = "FeatureTooltip";

export default FeatureTooltip;
