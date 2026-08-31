export type Sponsor = {
	name: string;
	url: string;
	logo: string;
	description: string;
	invertOnDark?: boolean;
};

export const SPONSORS: Sponsor[] = [
	{
		name: "Fal.ai",
		url: "https://fal.ai?utm_source=finalcliper",
		logo: "/logos/others/fal.svg",
		description: "Generative image, video, and audio models all in one place.",
		invertOnDark: true,
	},
	{
		name: "Vercel",
		url: "https://vercel.com?utm_source=finalcliper",
		logo: "/logos/others/vercel.svg",
		description: "Platform where we deploy and host Finalcliper.",
		invertOnDark: true,
	},
];
