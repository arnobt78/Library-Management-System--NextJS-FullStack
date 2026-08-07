/**
 * /api-docs — signed-in REST reference.
 * Hero matches All Books / My Profile (left h1 + light-200 subtitle).
 * Catalog: lib/apiDocs/endpoints.ts (all current app/api routes).
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Code,
  Database,
  Download,
  FileText,
  ImageIcon,
  Lock,
  Settings,
  Star,
  Users,
  Workflow,
  Clock,
  Activity,
  Library,
  Bug,
  Ticket,
  Bell,
  ScrollText,
} from "lucide-react";
import ApiEndpointCard from "@/components/ApiEndpointCard";
import { CopyButton } from "@/components/CopyButton";
import GlassSectionHeader from "@/components/GlassSectionHeader";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { auth } from "@/auth";
import {
  API_ENDPOINT_CATEGORIES,
  categoryTabValue,
  type ApiEndpointCategoryId,
} from "@/lib/apiDocs/endpoints";

const CATEGORY_ICONS: Record<ApiEndpointCategoryId, React.ReactNode> = {
  authentication: <Lock className="size-4 sm:size-5" />,
  books: <BookOpen className="size-4 sm:size-5" />,
  borrows: <Library className="size-4 sm:size-5" />,
  reviews: <Star className="size-4 sm:size-5" />,
  supportTickets: <Ticket className="size-4 sm:size-5" />,
  notifications: <Bell className="size-4 sm:size-5" />,
  activityLog: <ScrollText className="size-4 sm:size-5" />,
  users: <Users className="size-4 sm:size-5" />,
  admin: <Settings className="size-4 sm:size-5" />,
  export: <Download className="size-4 sm:size-5" />,
  status: <Activity className="size-4 sm:size-5" />,
  workflows: <Workflow className="size-4 sm:size-5" />,
  cron: <Clock className="size-4 sm:size-5" />,
  observability: <Bug className="size-4 sm:size-5" />,
};

const ApiDocsPage = async () => {
  const session = await auth();

  if (!session) {
    return (
      <main className="root-container">
        <div className="page-shell flex min-h-screen flex-col">
          <div className="page-shell-main empty-panel flex-1">
            <p className="mb-2 text-base font-medium text-red-400 sm:text-lg">
              Authentication Required
            </p>
            <p className="text-xs text-light-100/70 sm:text-sm">
              Please sign in to view API documentation.
            </p>
          </div>
          <Footer />
        </div>
      </main>
    );
  }

  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://university-library-managment.vercel.app"
      : "http://localhost:3000";

  const defaultTab = categoryTabValue(API_ENDPOINT_CATEGORIES[0].category);

  return (
    <main className="root-container">
      <div className="page-shell flex min-h-screen flex-col">
        <Header session={session} />
        <div className="page-shell-main flex-1 space-y-4 sm:space-y-6">
          {/* Match All Books / My Profile hero */}
          <div className="mb-0">
            <h1 className="text-xl font-medium text-light-100 sm:text-3xl">
              API Documentation
            </h1>
            <p className="text-sm text-light-200 sm:text-base">
              REST reference for BookWise library routes
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3">
              <Badge variant="glassReturned">
                <Code className="size-3" />
                REST API
              </Badge>
              <Badge variant="glassMuted">
                <Database className="size-3" />
                PostgreSQL
              </Badge>
              <Badge variant="glassMuted">
                <FileText className="size-3" />
                Next.js 16
              </Badge>
            </div>
          </div>

          <section className="space-y-2 sm:space-y-4">
            <GlassSectionHeader
              icon={<Code className="size-5 text-primary" />}
              title="Base URL"
              subtitle="All endpoints are relative to this origin"
            />
            <Card className="border-white/10 bg-dark-300/60 text-light-100 shadow-[0_12px_28px_rgba(0,0,0,0.25)] backdrop-blur-sm">
              <CardContent className="p-2 sm:p-4">
                <div className="flex flex-row items-center gap-2">
                  <code className="flex-1 rounded-md border border-white/10 bg-dark-300/80 px-2 py-1.5 font-mono text-xs text-light-100 sm:px-3 sm:py-2 sm:text-sm">
                    {baseUrl}
                  </code>
                  <CopyButton
                    text={baseUrl}
                    className="border-primary/40 bg-primary/20 hover:bg-primary/30 shrink-0 text-light-100 hover:text-light-100"
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-2 sm:space-y-4">
            <GlassSectionHeader
              icon={<BookOpen className="size-5 text-primary" />}
              title="API Endpoints"
              subtitle="Browse by domain — paths match app/api route handlers"
            />
            <Card className="border-white/10 bg-dark-300/60 text-light-100 shadow-[0_12px_28px_rgba(0,0,0,0.25)] backdrop-blur-sm">
              <CardContent className="p-2 sm:p-4">
                <Tabs defaultValue={defaultTab} className="w-full">
                  <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 border border-white/10 bg-transparent p-1 sm:mb-6">
                    {API_ENDPOINT_CATEGORIES.map((category) => (
                      <TabsTrigger
                        key={category.id}
                        value={categoryTabValue(category.category)}
                        className="data-[state=active]:border-primary/40 data-[state=active]:bg-primary/15 gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-[10px] text-light-200 data-[state=active]:text-light-100 sm:text-xs"
                      >
                        {CATEGORY_ICONS[category.id]}
                        <span>{category.category}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {API_ENDPOINT_CATEGORIES.map((category) => (
                    <TabsContent
                      key={category.id}
                      value={categoryTabValue(category.category)}
                      className="mt-0"
                    >
                      <div className="space-y-2 sm:space-y-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2 sm:mb-3">
                          <span className="text-light-200">
                            {CATEGORY_ICONS[category.id]}
                          </span>
                          <h3 className="text-base font-medium text-light-100 sm:text-lg">
                            {category.category}
                          </h3>
                          <Badge variant="glassMuted" className="ml-auto">
                            {category.endpoints.length} endpoints
                          </Badge>
                        </div>

                        {category.endpoints.map((endpoint) => (
                          <ApiEndpointCard
                            key={`${endpoint.method}-${endpoint.path}`}
                            method={endpoint.method}
                            path={endpoint.path}
                            description={endpoint.description}
                            auth={endpoint.auth}
                            adminOnly={endpoint.adminOnly || false}
                            requestBody={endpoint.requestBody}
                            response={endpoint.response}
                            baseUrl={baseUrl}
                          />
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-2 sm:space-y-4">
            <GlassSectionHeader
              icon={<Activity className="size-5 text-primary" />}
              title="HTTP Status Codes"
              subtitle="Common response codes returned by BookWise APIs"
            />
            <Card className="border-white/10 bg-dark-300/60 text-light-100 shadow-[0_12px_28px_rgba(0,0,0,0.25)] backdrop-blur-sm">
              <CardContent className="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 sm:gap-4 sm:p-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Badge variant="glassReturned">200</Badge>
                    <span className="text-xs text-light-200 sm:text-sm">
                      Success
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Badge variant="glassPending">201</Badge>
                    <span className="text-xs text-light-200 sm:text-sm">
                      Created
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Badge variant="glassMuted">400</Badge>
                    <span className="text-xs text-light-200 sm:text-sm">
                      Bad Request
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Badge
                      variant="glassMuted"
                      className="border-red-400/40 from-red-500/25 via-red-500/10 to-red-500/5"
                    >
                      401
                    </Badge>
                    <span className="text-xs text-light-200 sm:text-sm">
                      Unauthorized
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Badge
                      variant="glassMuted"
                      className="border-red-400/40 from-red-500/25 via-red-500/10 to-red-500/5"
                    >
                      403
                    </Badge>
                    <span className="text-xs text-light-200 sm:text-sm">
                      Forbidden
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Badge
                      variant="glassMuted"
                      className="border-red-400/40 from-red-500/25 via-red-500/10 to-red-500/5"
                    >
                      500
                    </Badge>
                    <span className="text-xs text-light-200 sm:text-sm">
                      Internal Server Error
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-2 sm:space-y-4">
            <GlassSectionHeader
              icon={<Lock className="size-5 text-primary" />}
              title="Authentication"
              subtitle="Session cookies via Auth.js — include credentials on protected calls"
            />
            <Card className="border-white/10 bg-dark-300/60 text-light-100 shadow-[0_12px_28px_rgba(0,0,0,0.25)] backdrop-blur-sm">
              <CardContent className="space-y-2 p-2 sm:p-4">
                <p className="text-xs text-light-200 sm:text-sm">
                  Protected routes require a signed-in Auth.js session. Browser
                  clients send the session cookie automatically with{" "}
                  <code className="text-light-100">
                    credentials: &quot;include&quot;
                  </code>
                  .
                </p>
                <div className="overflow-x-auto rounded-md border border-white/10 bg-dark-300/80 p-2 sm:p-3">
                  <pre className="text-xs text-light-200 sm:text-sm">
                    {`fetch('${baseUrl}/api/reviews/book-id', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rating: 5, comment: 'Great book!' })
})`}
                  </pre>
                </div>
                <p className="text-xs text-light-200/80 sm:text-sm">
                  Image uploads use{" "}
                  <code className="text-light-100">/api/auth/imagekit</code>{" "}
                  <ImageIcon className="inline size-3.5 align-text-bottom" />{" "}
                  for signed client tokens.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
        <Footer />
      </div>
    </main>
  );
};

export default ApiDocsPage;
