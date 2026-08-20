import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://universal-agent-config.vercel.app"),
  title: {
    default: "Universal Agent Config | AI Coding Agent Configuration Generator",
    template: "%s | Universal Agent Config",
  },
  description:
    "Generate native OpenCode, Claude Code, Codex, Cursor, Aider, omp, and Goose configurations from one guided page. Choose routing, models, permissions, and download a ready-to-install ZIP.",
  applicationName: "Universal Agent Config",
  keywords: [
    "AI coding agent configuration",
    "OpenCode config generator",
    "Claude Code settings generator",
    "Codex config generator",
    "Cursor rules generator",
    "Aider config generator",
    "Goose config generator",
    "OpenRouter model routing",
    "LiteLLM proxy config",
    "AI agent failover",
  ],
  authors: [{ name: "Jesse Ouellette", url: "https://github.com/jesseoue" }],
  creator: "Jesse Ouellette",
  openGraph: {
    type: "website",
    url: "https://universal-agent-config.vercel.app",
    siteName: "Universal Agent Config",
    title: "Universal Agent Config | AI Coding Agent Configuration Generator",
    description:
      "Build perfect coding-agent configs in one page. Generate native files for eight agent profiles, five gateways, validated OpenRouter routing, and download a ZIP.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Universal Agent Config | AI Coding Agent Configuration Generator",
    description:
      "One page. Eight agent profiles. Five routing technologies. Generate native OpenRouter routing and download it.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: { canonical: "/" },
  category: "developer tools",
  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  themeColor: "#f6f7f2",
  width: "device-width",
  initialScale: 1,
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Universal Agent Config",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Client-only configuration generator for OpenCode, omp, Claude Code, Codex, Cursor, Aider, and Goose.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Guided routing presets",
    "Native agent config generation",
    "Model capability validation",
    "Permission and safety policy",
    "ZIP download",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
    <body className="min-h-full bg-canvas font-sans text-text">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
