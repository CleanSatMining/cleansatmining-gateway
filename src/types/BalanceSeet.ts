import { MiningReport } from "@/types/MiningReport";

export type BalanceSheet = {
  start: Date;
  end: Date;
  days: number;
  balance: MiningReport;
  containerIds?: number[];
};

export type DetailedBalanceSheet = {
  start: Date;
  end: Date;
  days: number;
  containerIds: number[];
  balance: MiningReport;
  details: BalanceSheet[];
};
