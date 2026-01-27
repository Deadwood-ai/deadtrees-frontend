import { message } from "antd";

export interface DatasetSeasonInfo {
	admin_level_2?: string;
	admin_level_3?: string;
	country?: string;
	biome_name?: string;
	acquisition_date?: string;
	latitude?: number;
}

function getHemisphere(latitude: number | undefined): string {
	if (latitude === undefined) return "Unknown";
	return latitude >= 0 ? "Northern Hemisphere" : "Southern Hemisphere";
}

export function generateSeasonPrompt(dataset: DatasetSeasonInfo): string {
	const hemisphere = getHemisphere(dataset.latitude);

	return `TASK: Classify this aerial/drone image as IN SEASON or OUT OF SEASON

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATASET INFO:
• Location: ${dataset.admin_level_3 || "Unknown"}, ${dataset.admin_level_2 || "Unknown"}, ${dataset.country || "Unknown"}
• Biome: ${dataset.biome_name || "Unknown"}
• Acquisition Date: ${dataset.acquisition_date || "Unknown"}
• Latitude: ${dataset.latitude?.toFixed(2) || "Unknown"}° (${hemisphere})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLASSIFICATION RULES:

1️⃣ TROPICAL & SUBTROPICAL REGIONS → Always IN SEASON
   • No true leaf-off period
   • Do NOT apply month-based filtering
   • Examples: Brazil, Colombia, Indonesia, Philippines, Belize, 
     Congo, southern India, northern Australia, coastal Australia

2️⃣ TEMPERATE & BOREAL REGIONS → Use hemisphere + month

   🌍 Northern Hemisphere (Europe, USA, Canada, Nepal hills):
   • IN SEASON: May 15 – October 15
   • OUT OF SEASON: October 16 – May 14

   🌎 Southern Hemisphere (southern Australia, Chile, New Zealand):
   • IN SEASON: October 15 – May 15
   • OUT OF SEASON: May 16 – October 14

3️⃣ CONSISTENCY RULE
   • Follow calendar strictly, even if vegetation looks green
   • "OUT OF SEASON" = leaf-off or low phenological activity
   • Spring/Autumn count as OUT OF SEASON (transitional periods)

4️⃣ VISUAL INDICATORS (use to confirm, not override rules)
   • Deciduous trees without leaves → OUT OF SEASON
   • Brown/dormant grass in temperate zone → likely OUT OF SEASON
   • Snow on ground → OUT OF SEASON
   • Full green canopy in temperate summer → IN SEASON

5️⃣ EDGE CASES
   • Mediterranean climate (e.g., California, southern Spain): 
     Use temperate rules, but note summer drought may brown grass
   • High altitude temperate: Shorter season (June–September)
   • Coastal temperate: Extended season possible, but use standard dates
   • Mixed evergreen/deciduous: Classify based on deciduous trees

6️⃣ IF UNCERTAIN
   Determine in this order:
   1. Country / location
   2. Climate zone (tropical/subtropical vs temperate/boreal)
   3. Hemisphere
   4. Month
   
   If still unsure → respond "UNCERTAIN" with explanation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESPOND WITH EXACTLY ONE OF:
• IN SEASON
• OUT OF SEASON
• UNCERTAIN: [brief explanation]

Then provide a one-line reasoning.`;
}

async function copySeasonPromptWithImage(
	dataset: DatasetSeasonInfo,
	thumbnailUrl: string
): Promise<void> {
	const prompt = generateSeasonPrompt(dataset);

	try {
		// Fetch thumbnail as blob
		const response = await fetch(thumbnailUrl);
		const blob = await response.blob();

		// Create clipboard items with both text and image
		const clipboardItems = [
			new ClipboardItem({
				"text/plain": new Blob([prompt], { type: "text/plain" }),
				"image/png": blob,
			}),
		];

		await navigator.clipboard.write(clipboardItems);
		message.success("Prompt and image copied to clipboard!");
	} catch (err) {
		// Fallback: copy text only (Safari, older Firefox)
		console.debug("Image clipboard not supported, falling back to text only:", err);
		await navigator.clipboard.writeText(prompt);
		message.info("Prompt copied (image copy not supported in this browser)");
	}
}

async function copySeasonPromptTextOnly(dataset: DatasetSeasonInfo): Promise<void> {
	const prompt = generateSeasonPrompt(dataset);
	await navigator.clipboard.writeText(prompt);
	message.success("Season prompt copied to clipboard!");
}

// Hook for use in components
export function useSeasonPrompt() {
	const copyPromptWithImage = async (
		dataset: DatasetSeasonInfo,
		thumbnailUrl: string
	) => {
		await copySeasonPromptWithImage(dataset, thumbnailUrl);
	};

	const copyPromptTextOnly = async (dataset: DatasetSeasonInfo) => {
		await copySeasonPromptTextOnly(dataset);
	};

	return { copyPromptWithImage, copyPromptTextOnly, generateSeasonPrompt };
}
