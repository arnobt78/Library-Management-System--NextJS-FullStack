// Parent: REQ-0031

export interface DeterministicInsights {
  formulaVersion: "C2-v1";
  periodStart: string;
  periodEnd: string;
  circulation30Days: number;
  onTimeReturnRate: number;
  overdueRatio: number;
  outstandingFineTotal: number;
  demandToCopyRatio: number;
  holdPressure: number;
  renewalRate: number;
}
