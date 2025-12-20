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
    return <div>Please sign in to view API documentation.</div>;
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

        <div className="py-8">
          <div className="min-h-screen bg-transparent py-0">
            <div className="mx-auto max-w-7xl px-4">
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
              <div className="mb-8 text-center">
                <h1 className="mb-4 text-4xl font-bold text-light-100">
                  📚 BookWise API Documentation
                </h1>
                <p className="text-lg text-light-100">
                  Complete API reference for the University Library Management
                  System
                </p>
                <div className="mt-4 flex items-center justify-center gap-4">
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
              <Card className="mb-8 border-gray-700 bg-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-light-100">
                    <Code className="size-5" />
                    Base URL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-gray-700 px-3 py-2 font-mono text-sm text-light-100">
                      {baseUrl}
                    </code>
                    <CopyButton text={baseUrl} />
                  </div>
                  <p className="mt-2 text-sm text-light-200">
                    All API endpoints are relative to this base URL
                  </p>
                </CardContent>
              </Card>

              {/* API Endpoints with Tabs */}
              <Card className="mb-8 border-gray-700 bg-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-light-100">
                    <Code className="size-5" />
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
                    <TabsList className="grid w-full grid-cols-3 border-gray-600 bg-gray-700 lg:grid-cols-6">
                      {apiEndpoints.map((category) => (
                        <TabsTrigger
                          key={category.category}
                          value={category.category
                            .toLowerCase()
                            .replace(/\s+/g, "-")}
                          className="flex items-center gap-2 text-xs text-light-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
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
                        <div className="space-y-4">
                          <div className="mb-4 flex items-center gap-2">
                            {category.icon}
                            <h3 className="text-xl font-semibold text-light-100">
                              {category.category}
                            </h3>
                            <Badge
                              variant="outline"
                              className="ml-auto border-gray-600 bg-gray-700 text-light-200"
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
              <Card className="mb-8 border-gray-700 bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-light-100">
                    HTTP Status Codes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">
                          200
                        </Badge>
                        <span className="text-sm text-light-200">Success</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800">201</Badge>
                        <span className="text-sm text-light-200">Created</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-100 text-yellow-800">
                          400
                        </Badge>
                        <span className="text-sm text-light-200">
                          Bad Request
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-100 text-red-800">401</Badge>
                        <span className="text-sm text-light-200">
                          Unauthorized
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-100 text-red-800">403</Badge>
                        <span className="text-sm text-light-200">
                          Forbidden
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-100 text-red-800">500</Badge>
                        <span className="text-sm text-light-200">
                          Internal Server Error
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Authentication */}
              <Card className="mb-8 border-gray-700 bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-light-100">
                    Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-light-200">
                    This API uses NextAuth.js for authentication. Include the
                    session cookie in your requests for authenticated endpoints.
                  </p>
                  <div className="rounded bg-gray-700 p-3">
                    <pre className="text-sm text-light-200">
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
              <div className="mt-12 text-center">
                <p className="text-sm text-light-200">
                  BookWise University Library Management System API
                  Documentation
                </p>
                <p className="text-xs text-light-300">
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
