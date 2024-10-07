import { MiningReport } from "@/types/MiningReport";

export type BalanceSheet = {
  start: Date;
  end: Date;
  days: number;
  balance: MiningReport;
};

export type DetailedBalanceSheet = {
  start: Date;
  end: Date;
  days: number;
  balance: MiningReport;
  details: BalanceSheet[];
};
