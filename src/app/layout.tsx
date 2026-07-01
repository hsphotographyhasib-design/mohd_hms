import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://mohdhms.com";
const SITE_NAME = "MOHD.HMS ENTERPRISE";
const SITE_DESCRIPTION =
  "MOHD.HMS ENTERPRISE — Brunei's trusted facility maintenance & engineering partner. HVAC, electrical, plumbing, mechanical and fire protection, delivered by certified teams with 24/7 emergency support and smart CMMS tracking.";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Smart Facility Maintenance & Engineering`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "facility maintenance",
    "CMMS",
    "HVAC",
    "electrical engineering",
    "plumbing",
    "fire protection",
    "building maintenance",
    "preventive maintenance",
    "work orders",
    "Brunei",
    "Borneo",
    "MOHD.HMS",
    "facility management",
    "maintenance management",
    "asset management",
    "equipment tracking",
    "complaint management",
    "facility engineering",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Smart Facility Maintenance & Engineering`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1344,
        height: 768,
        alt: `${SITE_NAME} — Facility Maintenance & Engineering Services`,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Smart Facility Maintenance & Engineering`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
    creator: "@mohdhms",
  },
  other: {
    // WhatsApp / Facebook Messenger specific
    "og:image:width": "1344",
    "og:image:height": "768",
    "og:image:type": "image/png",
    "og:image:alt": `${SITE_NAME} — Facility Maintenance & Engineering Services`,
    // LinkedIn
    "og:site_name": SITE_NAME,
    // Discord
    "theme-color": "#059669",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  description: SITE_DESCRIPTION,
  telephone: "+673 999 9999",
  email: "info@mohdhms.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bandar Seri Begawan",
    addressCountry: "BN",
  },
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+673 999 9999",
    contactType: "customer service",
    availableLanguage: ["English"],
  },
  areaServed: {
    "@type": "Country",
    name: "Brunei",
  },
  serviceType: [
    "HVAC Maintenance",
    "Electrical Engineering",
    "Plumbing Services",
    "Fire Protection Systems",
    "Mechanical Services",
    "Preventive Maintenance",
    "24/7 Emergency Support",
  ],
  knowsAbout: ["CMMS", "Facility Management", "Building Maintenance"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="canonical" href={SITE_URL} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#059669" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Fallback meta for platforms that don't fully support OG */}
        <meta name="applicable-device" content="pc,mobile" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${poppins.className} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          storageKey="facilitypro-theme"
        >
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
