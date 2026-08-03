import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import QueryProvider from "@/components/QueryProvider";
import ScrollToTop from "@/components/ScrollToTop";

import localFont from "next/font/local";
import { ReactNode } from "react";
import SessionProviderWrapper from "./SessionProviderWrapper";
import { auth } from "@/auth";

/**
 * Local fonts (app/fonts) via next/font — self-hosted, preloaded, no Google CDN.
 * Relative ./fonts paths keep preload correct; adjustFontFallback reduces FOUT jump
 * when display:swap shows a metric-matched fallback until the face is ready.
 */
const ibmPlexSans = localFont({
  src: [
    { path: "./fonts/IBMPlexSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexSans-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/IBMPlexSans-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/IBMPlexSans-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-ibm-plex-sans",
  display: "swap",
  // localFont accepts "Arial" | "Times New Roman" | false (not boolean true)
  adjustFontFallback: "Arial",
  preload: true,
});

const bebasNeue = localFont({
  src: [
    { path: "./fonts/BebasNeue-Regular.ttf", weight: "400", style: "normal" },
  ],
  variable: "--font-bebas-neue",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_PROD_API_ENDPOINT ||
      "https://university-library-managment.vercel.app"
  ),
  title: {
    default: "BookWise | University Library Management System",
    template: "%s | BookWise",
  },
  description:
    "BookWise is a production-oriented full-stack university library platform for browsing the catalog, borrowing and returning books, reviews, admin CRUD, featured homepage hero, fines and reminders, analytics, and API health monitoring. Built with Next.js, TypeScript, PostgreSQL, and TanStack Query.",
  applicationName: "BookWise",
  authors: [
    {
      name: "Arnob Mahmud",
      url: "https://www.arnobmahmud.com",
    },
  ],
  creator: "Arnob Mahmud",
  publisher: "Arnob Mahmud",
  category: "education",
  keywords: [
    "BookWise",
    "University Library Management System",
    "university library",
    "library management",
    "book borrowing",
    "book catalog",
    "student portal",
    "admin dashboard",
    "role-based access control",
    "book reviews",
    "fine management",
    "Next.js",
    "React",
    "TypeScript",
    "PostgreSQL",
    "Drizzle ORM",
    "NextAuth",
    "TanStack Query",
    "ImageKit",
    "Upstash Redis",
    "QStash",
    "Brevo",
    "Resend",
    "Tailwind CSS",
    "shadcn/ui",
    "Arnob Mahmud",
  ],
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icons/logo.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.ico",
    apple: "/icons/logo.svg",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "BookWise | University Library Management System",
    description:
      "Browse books, borrow and return, leave reviews, and manage the library with a modern Next.js admin and student portal.",
    url: "https://university-library-managment.vercel.app/",
    siteName: "BookWise",
    images: [
      {
        url: "/images/auth-illustration.png",
        width: 1200,
        height: 630,
        alt: "BookWise University Library Management System",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BookWise | University Library Management System",
    description:
      "Full-stack university library platform: catalog, borrowing, reviews, admin tools, analytics, and more.",
    images: ["/images/auth-illustration.png"],
    creator: "@arnobt78",
  },
  other: {
    "contact:email": "contact@arnobmahmud.com",
    "author:url": "https://www.arnobmahmud.com",
  },
};

const RootLayout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${ibmPlexSans.variable} ${bebasNeue.variable}`}
    >
      <SessionProviderWrapper session={session}>
        <body
          className={`${ibmPlexSans.className} ${ibmPlexSans.variable} ${bebasNeue.variable} antialiased`}
          suppressHydrationWarning
        >
          <QueryProvider>
            <ScrollToTop />
            {children}
            <Toaster />
          </QueryProvider>
        </body>
      </SessionProviderWrapper>
    </html>
  );
};

export default RootLayout;
