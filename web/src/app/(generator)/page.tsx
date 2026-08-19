import { GeneratorStudio } from "@/components/generator-studio";

export const revalidate = false;

export default function GeneratorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <GeneratorStudio />
    </>
  );
}
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Universal Agent Config?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Universal Agent Config is a client-only web generator that creates native configuration files for OpenCode, Claude Code, Codex, Cursor, Aider, omp, and Goose from one guided workflow.",
          },
        },
        {
          "@type": "Question",
          name: "Does Universal Agent Config collect API keys?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. The app is client-only, requests no API keys, has no server API, and includes no runtime telemetry.",
          },
        },
        {
          "@type": "Question",
          name: "How do I install the generated configuration?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Review the generated files, copy any file directly, or download a ZIP containing native agent configs, a gateway environment example, install instructions, and a reusable uac.config.json file.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "Generate AI coding agent configuration",
      totalTime: "PT2M",
      step: [
        { "@type": "HowToStep", name: "Choose a preset", text: "Select balanced, open-weight, low-cost, frontier, or content-analysis routing." },
        { "@type": "HowToStep", name: "Select agents and gateway", text: "Choose the coding agents and routing gateway for your workflow." },
        { "@type": "HowToStep", name: "Validate model lanes", text: "Review tool and vision capability validation for every primary and fallback model." },
        { "@type": "HowToStep", name: "Generate and download", text: "Preview native files, copy them, or download the complete ZIP." },
      ],
    },
  ],
};
