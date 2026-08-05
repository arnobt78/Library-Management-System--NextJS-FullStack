"use client";

/**
 * AccountRequestsClient — Sign-up Requests UI (route: /admin/account-requests).
 *
 * Pending user registrations (users.status = PENDING), not make-admin requests.
 * usePendingUsers + SSR initialData; approve/reject via user mutations.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SafeImage } from "@/components/ui/safe-image";
import { Image as ImageKitImage } from "@imagekit/next";
import config from "@/lib/config";
import { resolveUniversityCard } from "@/lib/media/universityCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  User,
  Mail,
  GraduationCap,
  Calendar,
  Eye,
  Shield,
  Clock,
  FilterX,
  Loader2,
  CalendarPlus,
  CalendarCheck,
} from "lucide-react";
import { usePendingUsers, useSignupStatusDecisions } from "@/hooks/useQueries";
import { useApproveUser, useRejectUser } from "@/hooks/useMutations";
import UserSkeleton from "@/components/skeletons/UserSkeleton";
import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import PersonAttribution from "@/components/PersonAttribution";
import DateMetaLine from "@/components/DateMetaLine";
import type { User as UserType } from "@/lib/services/users";
import type { SignupStatusDecision } from "@/lib/admin/signupStatusDecisions";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";
import { UserPlus } from "lucide-react";

interface AccountRequestsClientProps {
  /**
   * Initial pending users data from SSR (prevents duplicate fetch)
   */
  initialUsers?: UserType[];
  /**
   * Recent APPROVED/REJECTED signup decisions (SSR; who + when)
   */
  initialRecentDecisions?: SignupStatusDecision[];
  /**
   * Logged-in admin from SSR — used for optimistic “Approved/Rejected by” (useSession is null here).
   */
  currentAdmin: AdminRequestReviewer;
  /**
   * Success message from URL params
   */
  successMessage?: string;
  /**
   * Error message from URL params
   */
  errorMessage?: string;
}

const AccountRequestsClient = ({
  initialUsers,
  initialRecentDecisions = [],
  currentAdmin,
  successMessage,
  errorMessage,
}: AccountRequestsClientProps) => {
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  // Get current search params from URL
  const currentSearch = searchParamsHook.get("search") || "";

  const [localSearch, setLocalSearch] = useState(currentSearch);
  const lastSyncedSearchRef = React.useRef(currentSearch);

  // Sync localSearch with URL params when they change externally (e.g., browser back/forward)
  // Only sync if the change didn't come from our own debounced update
  React.useEffect(() => {
    // Only sync if:
    // 1. currentSearch changed from an external source (not our debounce)
    // 2. localSearch matches the last synced value (user isn't actively typing)
    // This prevents overwriting user input while typing
    if (
      currentSearch !== lastSyncedSearchRef.current &&
      localSearch === lastSyncedSearchRef.current
    ) {
      setLocalSearch(currentSearch);
      lastSyncedSearchRef.current = currentSearch;
    }
  }, [currentSearch, localSearch]);

  // Debounce search input for instant filtering
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== currentSearch) {
        const params = new URLSearchParams(searchParamsHook.toString());
        const trimmedSearch = localSearch.trim();

        if (trimmedSearch) {
          params.set("search", trimmedSearch);
        } else {
          params.delete("search");
        }

        const newUrl = `/admin/account-requests?${params.toString()}`;
        // Update ref before navigation to prevent sync effect from overwriting
        lastSyncedSearchRef.current = trimmedSearch;
        router.replace(newUrl, { scroll: false });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearch, currentSearch, searchParamsHook, router]);

  // Check if any filters are active
  const hasActiveFilters = currentSearch;

  // Only use initialData on first load (when no filters are active)
  const initialUsersData =
    !hasActiveFilters && initialUsers ? initialUsers : undefined;

  // React Query hook with SSR initial data
  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorData,
  } = usePendingUsers(initialUsersData, currentSearch || undefined);

  // React Query mutations
  const approveUserMutation = useApproveUser();
  const rejectUserMutation = useRejectUser();

  // Recent decisions — refreshes on user.write invalidation
  const { data: recentDecisionsData } = useSignupStatusDecisions(
    initialRecentDecisions,
  );
  const recentDecisions = recentDecisionsData ?? initialRecentDecisions;

  // Track which card action is in flight (per-user spinner)
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionKind, setActionKind] = useState<"approve" | "reject" | null>(
    null,
  );

  // CRITICAL: Always prefer React Query data over initial data
  // React Query data is fresh and updates immediately after mutations
  // initial data is only used as fallback during initial load
  // Extract users from response
  // usePendingUsers returns User[] directly (not wrapped in UsersListResponse)
  const users: UserType[] = ((usersData ?? initialUsers) || []) as UserType[];

  const clearFilters = () => {
    setLocalSearch("");
    router.push("/admin/account-requests");
  };

  // Handler functions for mutations
  const handleApproveUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    setActionUserId(userId);
    setActionKind("approve");
    approveUserMutation.mutate(
      {
        userId,
        userName: user?.fullName,
        decisionActor: currentAdmin,
      },
      {
        onSettled: () => {
          setActionUserId(null);
          setActionKind(null);
        },
      },
    );
  };

  const handleRejectUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    setActionUserId(userId);
    setActionKind("reject");
    rejectUserMutation.mutate(
      {
        userId,
        userName: user?.fullName,
        decisionActor: currentAdmin,
      },
      {
        onSettled: () => {
          setActionUserId(null);
          setActionKind(null);
        },
      },
    );
  };

  // Show skeleton while loading (only if no initial data)
  if (usersLoading && (!initialUsers || initialUsers.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-0 sm:p-6">
        <div className="w-full">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 sm:text-3xl">
                  Sign-up Requests
                </h1>
                <p className="mt-1.5 text-sm text-gray-600 sm:mt-2 sm:text-base">
                  Review and approve pending user registrations
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <UserSkeleton key={`user-skeleton-${i}`} variant="card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (usersError && (!initialUsers || initialUsers.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-0 sm:p-6">
        <div className="w-full">
          <div className="py-6 text-center sm:py-8">
            <p className="mb-2 text-base font-semibold text-red-500 sm:text-lg">
              Failed to load sign-up requests
            </p>
            <p className="text-xs text-gray-500 sm:text-sm">
              {usersErrorData instanceof Error
                ? usersErrorData.message
                : "An unknown error occurred"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-slate-50 to-blue-50 p-0 sm:p-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-xl font-semibold text-gray-900 sm:text-3xl">
                Sign-up Requests
              </h1>
              <p className="mt-1.5 break-words text-sm text-gray-600 sm:mt-2 sm:text-base">
                Review and approve pending user registrations
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              {/* Instant debounced search — this component already debounces the URL push itself, so debounceMs=0 avoids stacking two delays */}
              <SearchInput
                value={localSearch}
                onChange={setLocalSearch}
                placeholder="Search by name, email, ID..."
                debounceMs={0}
                className="flex-1 sm:min-w-[250px]"
              />
              <div className="flex w-full items-center justify-start sm:w-auto sm:justify-center">
                <div className="shrink-0 rounded-full bg-orange-100 px-2.5 py-1 sm:px-3">
                  <span className="whitespace-nowrap text-xs font-medium text-orange-800 sm:text-sm">
                    {users.length} Pending
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Statistics Cards */}
        <StatCardGrid className="mb-4 sm:mb-6">
          <StatCard title="Pending Requests" value={users.length} icon={UserPlus} hue="amber" />
          <StatCard
            title="Recent Approved"
            value={recentDecisions.filter((d) => d.status === "APPROVED").length}
            icon={CheckCircle}
            hue="emerald"
          />
          <StatCard
            title="Recent Rejected"
            value={recentDecisions.filter((d) => d.status === "REJECTED").length}
            icon={XCircle}
            hue="rose"
          />
          <StatCard
            title="Total Decisions"
            value={recentDecisions.length}
            icon={Shield}
            hue="slate"
          />
        </StatCardGrid>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 sm:mb-6 sm:p-4">
            <div className="flex items-center">
              <CheckCircle className="size-4 text-green-400 sm:size-5" />
              <div className="ml-2 sm:ml-3">
                <h3 className="text-xs font-medium text-green-800 sm:text-sm">
                  {successMessage === "account-approved" &&
                    "✅ Account Approved Successfully!"}
                  {successMessage === "account-rejected" &&
                    "✅ Account Rejected Successfully!"}
                </h3>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 sm:mb-6 sm:p-4">
            <div className="flex items-center">
              <XCircle className="size-4 text-red-400 sm:size-5" />
              <div className="ml-2 sm:ml-3">
                <h3 className="text-xs font-medium text-red-800 sm:text-sm">
                  ❌ Operation Failed
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Requests Grid */}
        {users.length === 0 ? (
          <Card className="text-center">
            <CardContent className="py-8 sm:py-12">
              <div className="mx-auto mb-3 flex size-20 items-center justify-center rounded-full bg-gray-100 sm:mb-4 sm:size-24">
                <User className="size-10 text-gray-400 sm:size-12" />
              </div>
              <h3 className="mb-1.5 text-base font-medium text-gray-900 sm:mb-2 sm:text-lg">
                {hasActiveFilters
                  ? "No pending requests found matching your criteria."
                  : "No Pending Requests"}
              </h3>
              <p className="mb-3 text-sm text-gray-500 sm:mb-4 sm:text-base">
                {hasActiveFilters
                  ? "Try adjusting your search terms."
                  : "All sign-up requests have been processed."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-1.5 border-gray-300 text-xs text-gray-700 hover:bg-gray-100 sm:mt-2 sm:text-sm"
                >
                  <FilterX className="size-4" />
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {users.map((user) => (
              <AccountRequestCard
                key={user.id}
                user={user}
                onApprove={handleApproveUser}
                onReject={handleRejectUser}
                isPending={actionUserId === user.id}
                pendingKind={
                  actionUserId === user.id ? actionKind : null
                }
                actionsDisabled={
                  actionUserId != null && actionUserId !== user.id
                }
              />
            ))}
          </div>
        )}

        {/* Recent signup decisions — applicant + reviewer attribution */}
        {recentDecisions.length > 0 ? (
          <div className="mt-6 sm:mt-8">
            <h3 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">
              Recent decisions ({recentDecisions.length})
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {recentDecisions.map((decision) => {
                const approved = decision.status === "APPROVED";
                const borderClass = approved
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50";
                const textClass = approved ? "text-green-900" : "text-red-900";
                const mutedClass = approved ? "text-green-700" : "text-red-700";
                const registered = decision.createdAt
                  ? new Date(decision.createdAt).toLocaleString()
                  : null;

                return (
                  <div
                    key={decision.id}
                    className={`rounded-lg border p-3 sm:p-4 ${borderClass}`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                          approved
                            ? "bg-green-200 text-green-900"
                            : "bg-red-200 text-red-900"
                        }`}
                      >
                        {approved ? (
                          <CheckCircle className="size-3" aria-hidden />
                        ) : (
                          <XCircle className="size-3" aria-hidden />
                        )}
                        {approved ? "Approved" : "Rejected"}
                      </span>
                      <PersonAttribution
                        person={{
                          id: decision.userId,
                          fullName: decision.fullName,
                          email: decision.email,
                          universityCard: decision.universityCard,
                        }}
                        href={`/admin/users/${decision.userId}`}
                        size={28}
                        className={`text-sm ${mutedClass}`}
                        textClassName={textClass}
                      />
                    </div>
                    {registered ? (
                      <DateMetaLine
                        icon={CalendarPlus}
                        className={`mb-1 ${mutedClass}`}
                      >
                        Registered on {registered}
                      </DateMetaLine>
                    ) : null}
                    <AdminRequestReviewerAttribution
                      reviewer={decision.decisionActor}
                      prefix={approved ? "Approved by" : "Rejected by"}
                      size={28}
                      className={`mt-2 text-xs sm:text-sm ${mutedClass}`}
                      textClassName={textClass}
                      href={
                        decision.decisionActor?.id
                          ? `/admin/users/${decision.decisionActor.id}`
                          : null
                      }
                    />
                    <DateMetaLine icon={CalendarCheck} className={`mt-1 ${mutedClass}`}>
                      {decision.decidedAt
                        ? new Date(decision.decidedAt).toLocaleString()
                        : "N/A"}
                    </DateMetaLine>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// Account Request Card Component
const AccountRequestCard = ({
  user,
  onApprove,
  onReject,
  isPending,
  pendingKind,
  actionsDisabled,
}: {
  user: UserType;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  isPending: boolean;
  pendingKind: "approve" | "reject" | null;
  actionsDisabled: boolean;
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const cardMedia = resolveUniversityCard(user.universityCard);

  return (
    <Card className="group border-0 shadow-md transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="space-y-2 sm:space-y-3">
          {/* Badge on its own row */}
          <div className="flex justify-start">
            <Badge
              variant="pending"
              className="flex items-center gap-0.5 sm:space-x-1"
            >
              <Clock className="size-2.5 sm:size-3" />
              <span className="text-[10px] sm:text-xs">PENDING</span>
            </Badge>
          </div>
          {/* Avatar and user info with full width */}
          <div className="flex items-center gap-2 sm:space-x-3">
            <Avatar className="size-10 sm:size-12">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-semibold text-white sm:text-sm">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Link
                prefetch={false}
                href={`/admin/users/${user.id}`}
                className="break-words text-base font-semibold text-blue-700 hover:underline sm:text-lg"
              >
                {user.fullName}
              </Link>
              <div className="flex items-center gap-1 text-xs text-gray-500 sm:space-x-1 sm:text-sm">
                <Mail className="size-2.5 shrink-0 sm:size-3" />
                <span className="break-all">{user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4">
        {/* University ID */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs sm:space-x-2 sm:text-sm">
          <GraduationCap className="size-3 shrink-0 text-blue-500 sm:size-4" />
          <span className="text-gray-600">University ID:</span>
          <span className="break-words font-medium text-gray-900">
            {user.universityId}
          </span>
        </div>

        {/* Registration date + awaiting review */}
        <div className="space-y-1 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-1.5 sm:space-x-2">
            <Calendar className="size-3 shrink-0 text-green-500 sm:size-4" />
            <span className="text-gray-600">Registered:</span>
            <span className="break-words font-medium text-gray-900">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "N/A"}
            </span>
          </div>
          <p className="pl-4 text-amber-700 sm:pl-5">Awaiting review</p>
        </div>

        {/* University Card */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:space-x-2">
            <Shield className="size-3 shrink-0 text-purple-500 sm:size-4" />
            <span className="break-words text-xs font-medium text-gray-700 sm:text-sm">
              University Card
            </span>
          </div>
          {cardMedia.kind !== "empty" ? (
            <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
              <DialogTrigger asChild>
                <div className="group relative h-24 w-full cursor-pointer overflow-hidden rounded-lg border border-gray-200 transition-colors hover:border-blue-300 sm:h-32">
                  {cardMedia.kind === "imagekit" ? (
                    <ImageKitImage
                      src={cardMedia.path}
                      urlEndpoint={config.env.imagekit.urlEndpoint}
                      alt="University Card"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <SafeImage
                      src={cardMedia.src}
                      alt="University Card"
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 400px"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-all duration-200 group-hover:bg-black/20">
                    <div className="rounded-full bg-white/90 p-1.5 opacity-0 transition-opacity group-hover:opacity-100 sm:p-2">
                      <Eye className="size-3 text-gray-700 sm:size-4" />
                    </div>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">
                    University Card - {user.fullName}
                  </DialogTitle>
                </DialogHeader>
                <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-lg sm:mt-4">
                  {cardMedia.kind === "imagekit" ? (
                    <ImageKitImage
                      src={cardMedia.path}
                      urlEndpoint={config.env.imagekit.urlEndpoint}
                      alt="University Card"
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <SafeImage
                      src={cardMedia.src}
                      alt="University Card"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 672px"
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="flex h-24 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-100 sm:h-32">
              <div className="text-center">
                <Shield className="mx-auto mb-1.5 size-6 text-gray-400 sm:mb-2 sm:size-8" />
                <p className="text-xs text-gray-500 sm:text-sm">
                  No card uploaded
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons — once-click spinner while this card's mutation runs */}
        <div className="flex flex-col gap-1.5 pt-1.5 sm:flex-row sm:space-x-2 sm:pt-2">
          <Button
            className="w-full rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 sm:flex-1 sm:px-4 sm:py-2 sm:text-sm"
            onClick={() => onApprove(user.id)}
            disabled={isPending || actionsDisabled}
          >
            {isPending && pendingKind === "approve" ? (
              <Loader2 className="mr-1 size-3 animate-spin sm:mr-2 sm:size-4" />
            ) : (
              <CheckCircle className="mr-1 size-3 sm:mr-2 sm:size-4" />
            )}
            {isPending && pendingKind === "approve" ? "Approving…" : "Approve"}
          </Button>

          <Button
            variant="destructive"
            className="w-full rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:flex-1 sm:px-4 sm:py-2 sm:text-sm"
            onClick={() => onReject(user.id)}
            disabled={isPending || actionsDisabled}
          >
            {isPending && pendingKind === "reject" ? (
              <Loader2 className="mr-1 size-3 animate-spin sm:mr-2 sm:size-4" />
            ) : (
              <XCircle className="mr-1 size-3 sm:mr-2 sm:size-4" />
            )}
            {isPending && pendingKind === "reject" ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountRequestsClient;
