import { MinimalHero } from "@/components/landing/minimal-hero";
import { BrutalistFeatures } from "@/components/landing/brutalist-features";
import { InteractivePipeline } from "@/components/landing/interactive-pipeline";
import { BrutalistCta } from "@/components/landing/brutalist-cta";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";
import { SITE_URL } from "@/site/brand";

export const metadata: Metadata = {
	title: "Finalcliper — Video Intelligence & Local-First Editor",
	description:
		"Cut, composite, caption, and synthesize. Powered by an on-device Rust GPU editing engine and Google Veo / Gemini generative video pipeline.",
	alternates: {
		canonical: SITE_URL,
	},
};

export default async function Home() {
	return (
		<div className="min-h-screen bg-black text-white">
			<Header />
			<main>
				<MinimalHero />
				<BrutalistFeatures />
				<InteractivePipeline />
				<BrutalistCta />
			</main>
			<Footer />
		</div>
	);
}

