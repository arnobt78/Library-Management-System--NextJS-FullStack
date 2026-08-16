/**
 * Business Insights client shell — header period FilterSelect (default All History)
 * + dismissible chips; charts receive controlled opsPeriod (no invent densify).
 */
"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { FilterSelect } from "@/components/ui/filter-select";
import { DismissibleFilterChips } from "@/components/ui/DismissibleFilterChips";
import type { AnalyticsData } from "@/lib/services/analytics";
import {
  insightsOpsPeriodOptions,
  type InsightsOpsPeriod,
} from "@/lib/ui/periodFilterOptions";

const OPS_PERIOD_OPTIONS = insightsOpsPeriodOptions("light");

export function BusinessInsightsClient({
  initialData,
}: {
  initialData: AnalyticsData;
}) {
  const [opsPeriod, setOpsPeriod] = useState<InsightsOpsPeriod>("all");
  const periodLabel =
    OPS_PERIOD_OPTIONS.find((o) => o.value === opsPeriod)?.label ?? opsPeriod;

  return (
    <AdminPageShell
      header={
        <div className="space-y-3">
          <AdminPageHeader
            title="Business Insights"
            description="Circulation analytics and library trends"
            icon={BarChart3}
            actions={
              <FilterSelect
                label="Ops Period"
                variant="light"
                labelLayout="embedded"
                value={opsPeriod}
                onValueChange={(v) => setOpsPeriod(v as InsightsOpsPeriod)}
                options={OPS_PERIOD_OPTIONS}
                className="w-full sm:w-48"
              />
            }
          />
          <DismissibleFilterChips
            variant="light"
            onReset={() => setOpsPeriod("all")}
            groups={
              opsPeriod !== "all"
                ? [
                    {
                      label: "Period",
                      values: [opsPeriod],
                      onClear: () => setOpsPeriod("all"),
                      renderBadge: () => (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {periodLabel}
                        </span>
                      ),
                    },
                  ]
                : []
            }
          />
        </div>
      }
    >
      <AnalyticsCharts
        initialData={initialData}
        opsPeriod={opsPeriod}
        onOpsPeriodChange={setOpsPeriod}
      />
    </AdminPageShell>
  );
}
