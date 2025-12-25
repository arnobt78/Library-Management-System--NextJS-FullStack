import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ExternalLink,
  Code,
  Database,
  Users,
  Star,
  Download,
  Settings,
  Workflow,
  ImageIcon,
} from "lucide-react";
import ApiEndpointCard from "@/components/ApiEndpointCard";
import { CopyButton } from "@/components/CopyButton";
import Header from "@/components/Header";
import { auth } from "@/auth";

const ApiDocsPage = async () => {
  const session = await auth();

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="py-6 text-center sm:py-8">
            <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
              Authentication Required
            </p>
            <p className="text-xs text-gray-500 sm:text-sm">
              Please sign in to view API documentation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://university-library-managment.vercel.app"
      : "http://localhost:3000";

  const apiEndpoints = [
    // Authentication APIs
    {
      category: "Authentication",
      icon: <Users className="size-5" />,
      endpoints: [
        {
          method: "POST",
          path: "/api/auth/signin",
          description: "User sign in",
          auth: false,
          adminOnly: false,
          requestBody: {
            email: "string",
            password: "string",
          },
          response: {
            success: true,
            user: {
              id: "string",
              email: "string",
              name: "string",
            },
          },
        },
        {
          method: "POST",
          path: "/api/auth/signout",
          description: "User sign out",
          auth: false,
          adminOnly: false,
          requestBody: undefined,
          response: {
            success: true,
            message: "Signed out successfully",
          },
        },
      ],
    },
    // Reviews APIs
    {
      category: "Reviews",
      icon: <Star className="size-5" />,
      endpoints: [
        {
          method: "GET",
          path: "/api/reviews/{bookId}",
          description: "Get all reviews for a book",
          auth: false,
          adminOnly: false,
          requestBody: undefined,
          response: {
            success: true,
            reviews: [
              {
                id: "string",
                rating: "number (1-5)",
                comment: "string",
                createdAt: "string",
                userFullName: "string",
                userEmail: "string",
              },
            ],
          },
        },
        {
          method: "POST",
          path: "/api/reviews/{bookId}",
          description: "Create a new review",
          auth: true,
          adminOnly: false,
          requestBody: {
            rating: "number (1-5)",
            comment: "string",
          },
          response: {
            success: true,
            review: {
              id: "string",
              rating: "number",
              comment: "string",
              createdAt: "string",
            },
            message: "Review submitted successfully",
          },
        },
        {
          method: "PUT",
          path: "/api/reviews/edit/{reviewId}",
          description: "Edit an existing review",
          auth: true,
          adminOnly: false,
          requestBody: {
            rating: "number (1-5)",
            comment: "string",
          },
          response: {
            success: true,
            review: {
              id: "string",
              rating: "number",
              comment: "string",
              updatedAt: "string",
            },
          },
        },
        {
          method: "DELETE",
          path: "/api/reviews/delete/{reviewId}",
          description: "Delete a review",
          auth: true,
          adminOnly: false,
          requestBody: undefined,
          response: {
            success: true,
            message: "Review deleted successfully",
          },
        },
        {
          method: "GET",
          path: "/api/reviews/eligibility/{bookId}",
          description: "Check if user can review a book",
          auth: false,
          adminOnly: false,
          requestBody: undefined,
          response: {
            success: true,
            canReview: "boolean",
            hasExistingReview: "boolean",
            isCurrentlyBorrowed: "boolean",
            reason: "string",
          },
        },
      ],
    },
    // Admin Export APIs
    {
      category: "Data Export",
      icon: <Download className="size-5" />,
      endpoints: [
        {
          method: "POST",
          path: "/api/admin/export/books",
          description: "Export books data",
          auth: true,
          adminOnly: true,
          requestBody: {
            format: "csv | json",
          },
          response: "File download (CSV/JSON)",
        },
        {
          method: "POST",
          path: "/api/admin/export/users",
          description: "Export users data",
          auth: true,
          adminOnly: true,
          requestBody: {
            format: "csv | json",
          },
          response: "File download (CSV/JSON)",
        },
        {
          method: "POST",
          path: "/api/admin/export/borrows",
          description: "Export borrow records data",
          auth: true,
          adminOnly: true,
          requestBody: {
            format: "csv | json",
          },
          response: "File download (CSV/JSON)",
        },
        {
          method: "POST",
          path: "/api/admin/export/borrows-range",
          description: "Export borrow records for date range",
          auth: true,
          adminOnly: true,
          requestBody: {
            format: "csv | json",
            startDate: "string (YYYY-MM-DD)",
            endDate: "string (YYYY-MM-DD)",
          },
          response: "File download (CSV/JSON)",
        },
        {
          method: "POST",
          path: "/api/admin/export/analytics",
          description: "Export analytics data",
          auth: true,
          adminOnly: true,
          requestBody: {
            format: "csv | json",
          },
          response: "File download (CSV/JSON)",
        },
      ],
    },
    // Admin Management APIs
    {
      category: "Admin Management",
      icon: <Settings className="size-5" />,
      endpoints: [
        {
          method: "POST",
          path: "/api/admin/update-overdue-fines",
          description: "Update overdue fines for all books",
          auth: true,
          adminOnly: true,
          requestBody: {
            fineAmount: "number (optional)",
          },
          response: {
            success: true,
            message: "string",
            results: "array",
          },
        },
        {
          method: "GET",
          path: "/api/admin/fine-config",
          description: "Get fine configuration",
          auth: true,
          adminOnly: true,
          response: {
            success: true,
            fineAmount: "number",
          },
        },
        {
          method: "POST",
          path: "/api/admin/fine-config",
          description: "Update fine configuration",
          auth: true,
          adminOnly: true,
          requestBody: {
            fineAmount: "number",
            updatedBy: "string",
          },
          response: {
            success: true,
            message: "string",
            fineAmount: "number",
          },
        },
        {
          method: "POST",
          path: "/api/admin/send-due-soon-reminders",
          description: "Send due soon reminders",
          auth: true,
          adminOnly: true,
          response: {
            success: true,
            message: "string",
            count: "number",
          },
        },
        {
          method: "POST",
          path: "/api/admin/send-overdue-reminders",
          description: "Send overdue reminders",
          auth: true,
          adminOnly: true,
          response: {
            success: true,
            message: "string",
            count: "number",
          },
        },
      ],
    },
    // Workflow APIs
    {
      category: "Workflows",
      icon: <Workflow className="size-5" />,
      endpoints: [
        {
          method: "POST",
          path: "/api/workflows/onboarding",
          description: "Handle user onboarding workflow",
          auth: true,
          adminOnly: false,
          requestBody: {
            step: "string",
            data: "object",
          },
          response: {
            success: true,
            nextStep: "string",
            data: "object",
          },
        },
      ],
    },
    // ImageKit API
    {
      category: "Media",
      icon: <ImageIcon className="size-5" />,
      endpoints: [
        {
          method: "POST",
          path: "/api/auth/imagekit",
          description: "Get ImageKit authentication token",
          auth: true,
          adminOnly: false,
          requestBody: undefined,
          response: {
            token: "string",
            expire: "number",
            signature: "string",
          },
        },
      ],
    },
  ];

  return (
    <main className="root-container">
      <div className="mx-auto w-full">
        <Header session={session} />

        <div className="py-4 sm:py-8">
          <div className="min-h-screen bg-transparent py-0">
            <div className="mx-auto max-w-7xl">
              {/* Return Button */}
              {/* <div className="mb-6">
                <Link href="/">
                  <Button variant="outline" className="flex items-center gap-2">
                    <ArrowLeft className="size-4" />
                    Back to Home
                  </Button>
                </Link>
              </div> */}
              {/* Header */}
              <div className="mb-6 text-center sm:mb-8">
                <h1 className="mb-3 text-2xl font-bold text-light-100 sm:mb-4 sm:text-4xl">
                  📚 BookWise API Documentation
                </h1>
                <p className="text-sm text-light-100 sm:text-lg">
                  Complete API reference for the University Library Management
                  System
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-4 sm:gap-4">
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-50 text-green-700"
                  >
                    <Code className="mr-2 size-4" />
                    REST API
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-blue-700"
                  >
                    <Database className="mr-2 size-4" />
                    PostgreSQL
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-purple-200 bg-purple-50 text-purple-700"
                  >
                    <ExternalLink className="mr-2 size-4" />
                    Next.js 15
                  </Badge>
                </div>
              </div>

              {/* Base URL */}
              <Card className="mb-6 border-gray-700 bg-gray-800 sm:mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-light-100 sm:text-lg">
                    <Code className="size-4 sm:size-5" />
                    Base URL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-row items-center gap-2">
                    <code className="flex-1 rounded bg-gray-700 px-2 py-1.5 font-mono text-xs text-light-100 sm:px-3 sm:py-2 sm:text-sm">
                      {baseUrl}
                    </code>
                    <CopyButton
                      text={baseUrl}
                      className="shrink-0 border-blue-500 bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                    />
                  </div>
                  <p className="mt-2 text-xs text-light-200 sm:text-sm">
                    All API endpoints are relative to this base URL
                  </p>
                </CardContent>
              </Card>

              {/* API Endpoints with Tabs */}
              <Card className="mb-6 border-gray-700 bg-gray-800 sm:mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-light-100 sm:text-lg">
                    <Code className="size-4 sm:size-5" />
                    API Endpoints
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs
                    defaultValue={apiEndpoints[0].category
                      .toLowerCase()
                      .replace(/\s+/g, "-")}
                    className="w-full"
                  >
                    <TabsList className="mb-4 flex w-full flex-wrap gap-1 border-gray-600 bg-gray-700 p-1 sm:mb-6 sm:grid sm:grid-cols-3 sm:gap-0 lg:grid-cols-6">
                      {apiEndpoints.map((category) => (
                        <TabsTrigger
                          key={category.category}
                          value={category.category
                            .toLowerCase()
                            .replace(/\s+/g, "-")}
                          className="flex flex-1 items-center justify-center rounded-md bg-gray-700 p-2 text-[10px] text-light-200 transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md sm:flex-none sm:gap-2 sm:p-1.5 sm:text-xs [&>svg]:size-4 [&>svg]:text-light-200 [&>svg]:data-[state=active]:text-white sm:[&>svg]:size-5"
                        >
                          {category.icon}
                          <span className="hidden sm:inline">
                            {category.category}
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {apiEndpoints.map((category) => (
                      <TabsContent
                        key={category.category}
                        value={category.category
                          .toLowerCase()
                          .replace(/\s+/g, "-")}
                        className="mt-6"
                      >
                        <div className="space-y-3 sm:space-y-4">
                          <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6">
                            <span className="text-light-200 [&>svg]:size-5 [&>svg]:text-light-200">
                              {category.icon}
                            </span>
                            <h3 className="text-base font-semibold text-light-100 sm:text-xl">
                              {category.category}
                            </h3>
                            <Badge
                              variant="outline"
                              className="ml-auto border-gray-600 bg-gray-700 text-xs text-light-200 sm:text-sm"
                            >
                              {category.endpoints.length} endpoints
                            </Badge>
                          </div>

                          {category.endpoints.map((endpoint, index) => (
                            <ApiEndpointCard
                              key={index}
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

              {/* Status Codes */}
              <Card className="mb-6 border-gray-700 bg-gray-800 sm:mb-8">
                <CardHeader>
                  <CardTitle className="text-base text-light-100 sm:text-lg">
                    HTTP Status Codes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Badge className="bg-green-100 text-xs text-green-800 sm:text-sm">
                          200
                        </Badge>
                        <span className="text-xs text-light-200 sm:text-sm">
                          Success
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Badge className="bg-blue-100 text-xs text-blue-800 sm:text-sm">
                          201
                        </Badge>
                        <span className="text-xs text-light-200 sm:text-sm">
                          Created
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Badge className="bg-yellow-100 text-xs text-yellow-800 sm:text-sm">
                          400
                        </Badge>
                        <span className="text-xs text-light-200 sm:text-sm">
                          Bad Request
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Badge className="bg-red-100 text-xs text-red-800 sm:text-sm">
                          401
                        </Badge>
                        <span className="text-xs text-light-200 sm:text-sm">
                          Unauthorized
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Badge className="bg-red-100 text-xs text-red-800 sm:text-sm">
                          403
                        </Badge>
                        <span className="text-xs text-light-200 sm:text-sm">
                          Forbidden
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Badge className="bg-red-100 text-xs text-red-800 sm:text-sm">
                          500
                        </Badge>
                        <span className="text-xs text-light-200 sm:text-sm">
                          Internal Server Error
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Authentication */}
              <Card className="mb-6 border-gray-700 bg-gray-800 sm:mb-8">
                <CardHeader>
                  <CardTitle className="text-base text-light-100 sm:text-lg">
                    Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs text-light-200 sm:mb-4 sm:text-sm">
                    This API uses NextAuth.js for authentication. Include the
                    session cookie in your requests for authenticated endpoints.
                  </p>
                  <div className="overflow-x-auto rounded bg-gray-700 p-2 sm:p-3">
                    <pre className="text-xs text-light-200 sm:text-sm">
                      {`// Example: Making an authenticated request
fetch('${baseUrl}/api/reviews/book-id', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'next-auth.session-token=your-session-token'
  },
  body: JSON.stringify({
    rating: 5,
    comment: 'Great book!'
  })
})`}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              {/* Footer */}
              <div className="mt-8 text-center sm:mt-12">
                <p className="text-xs text-light-200 sm:text-sm">
                  BookWise University Library Management System API
                  Documentation
                </p>
                <p className="mt-1 text-[10px] text-light-300 sm:text-xs">
                  Generated automatically • Last updated:{" "}
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ApiDocsPage;
