/**
 * Users API Route
 *
 * GET /api/users
 *
 * Purpose: Get a list of users with optional search, filters, sorting, and pagination.
 *
 * Query Parameters:
 * - search (optional): Search by name, email, or university ID
 * - status (optional): Filter by status ("PENDING", "APPROVED", "REJECTED", or "all")
 * - role (optional): Filter by role ("USER", "ADMIN", or "all")
 * - sort (optional): Sort order ("name", "email", "created", "status")
 * - page (optional): Page number (default: 1)
 * - limit (optional): Users per page (default: 50)
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { desc, asc, eq, like, and, or, sql } from "drizzle-orm";
import { auth } from "@/auth";

export const runtime = "nodejs";

/**
 * Get users list with filters and pagination
 *
 * @param request - Next.js request object
 * @returns JSON response with users array, pagination info
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication - only admins can access this endpoint
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "You must be logged in to access this resource",
        },
        { status: 401 }
      );
    }

    // Check if user is admin
    const currentUser = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (currentUser[0]?.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "Only admins can access this resource",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const role = searchParams.get("role") || "";
    const sort = searchParams.get("sort") || "name";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Build where conditions
    const whereConditions = [];

    // Search condition (name, email, or university ID)
    if (search) {
      const searchPattern = `%${search}%`;
      whereConditions.push(
        or(
          like(users.fullName, searchPattern),
          like(users.email, searchPattern),
          sql`CAST(${users.universityId} AS TEXT) LIKE ${searchPattern}`
        )
      );
    }

    // Status filter
    if (status && status !== "all") {
      whereConditions.push(eq(users.status, status as "PENDING" | "APPROVED" | "REJECTED"));
    }

    // Role filter
    if (role && role !== "all") {
      whereConditions.push(eq(users.role, role as "USER" | "ADMIN"));
    }

    // Build sort order
    let orderBy;
    switch (sort) {
      case "email":
        orderBy = asc(users.email);
        break;
      case "created":
        orderBy = desc(users.createdAt);
        break;
      case "status":
        orderBy = asc(users.status);
        break;
      case "name":
      default:
        orderBy = asc(users.fullName);
        break;
    }

    // Fetch users with pagination
    const offset = (page - 1) * limit;
    const allUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        universityId: users.universityId,
        universityCard: users.universityCard,
        status: users.status,
        role: users.role,
        lastActivityDate: users.lastActivityDate,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        // Exclude password for security
      })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const totalUsers = totalUsersResult[0]?.count || 0;
    const totalPages = Math.ceil(totalUsers / limit);

    return NextResponse.json({
      success: true,
      users: allUsers,
      total: totalUsers,
      page,
      totalPages,
      limit,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch users",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

