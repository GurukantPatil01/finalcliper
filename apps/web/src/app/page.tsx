import { EditorialHero } from "@/components/landing/editorial-hero";
import { EditorialWorkflow, EditorialCta } from "@/components/landing/editorial-workflow";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";
import { SITE_URL } from "@/site/brand";

export const metadata: Metadata = {
title: "FinalCliper — Local-first Video Editor & AI Rough-Cut Studio",
description:
"Import, rough-cut with Gemini agents, craft on a multitrack timeline and export locally. A Rust GPU editing engine in an editorial interface.",
alternates: {
canonical: SITE_URL,
},
};

export default async function Home() {
return (
<div className="min-h-screen bg-background text-foreground">
<Header />
<main>
<EditorialHero />
<EditorialWorkflow />
<EditorialCta />
</main>
<Footer />
</div>
);
}
