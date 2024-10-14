import { convertToUTCStartOfDay } from "@/tools/date";
import {
  DailyFinancialStatement,
  FinancialPartnaire,
  FinancialStatementAmount,
} from "./FinancialSatement";
import { Database } from "./supabase";

export type MiningReport = {
  uptime: number;
  hashrateTHs: number;
  hashrateTHsMax: number;
  btcSellPrice: number;
  expenses: {
    electricity: FinancialStatementAmount;
    csm: FinancialStatementAmount;
    operator: FinancialStatementAmount;
    other: FinancialStatementAmount;
  };
  income: {
    pool: FinancialStatementAmount;
    other: FinancialStatementAmount;
  };
};

export type SiteMiningReport = {
  site: string;
} & MiningReport;

export type DailySiteMiningReport = DailyMiningReport & {
  site: string;
};

export type DailyFarmMiningReport = DailyMiningReport & {
  bySite: Record<string, SiteMiningReport>;
};

export type DailyMiningReport = {
  day: Date;
  site?: string;
  uptime: number;
  hashrateTHs: number;
  hashrateTHsMax: number;
  btcSellPrice: number;
  expenses: {
    electricity: FinancialStatementAmount;
    csm: FinancialStatementAmount;
    operator: FinancialStatementAmount;
    other: FinancialStatementAmount;
  };
  income: {
    pool: FinancialStatementAmount;
    other: FinancialStatementAmount;
  };
  bySite?: Record<string, SiteMiningReport>;
};

export function mapDailyMiningReportToSiteMiningReport(
  report: DailyMiningReport,
  site: string
): DailySiteMiningReport {
  return {
    day: report.day,
    site: site,
    uptime: report.uptime,
    hashrateTHs: report.hashrateTHs,
    hashrateTHsMax: report.hashrateTHsMax,
    btcSellPrice: report.btcSellPrice,
    expenses: {
      electricity: report.expenses.electricity,
      csm: report.expenses.csm,
      operator: report.expenses.operator,
      other: report.expenses.other,
    },
    income: {
      pool: report.income.pool,
      other: report.income.other,
    },
  };
}

export function mapSiteMiningReportToMiningReport(
  report: DailySiteMiningReport
): DailyMiningReport {
  return {
    day: report.day,
    uptime: report.uptime,
    hashrateTHs: report.hashrateTHs,
    hashrateTHsMax: report.hashrateTHsMax,
    btcSellPrice: report.btcSellPrice,
    expenses: {
      electricity: report.expenses.electricity,
      csm: report.expenses.csm,
      operator: report.expenses.operator,
      other: report.expenses.other,
    },
    income: {
      pool: report.income.pool,
      other: report.income.other,
    },
  };
}

export function convertDailyFinancialStatementToMiningReport(
  dayStatement: DailyFinancialStatement
): DailyMiningReport {
  return {
    day: convertToUTCStartOfDay(dayStatement.day),
    uptime: dayStatement.uptime,
    hashrateTHs: dayStatement.hashrateTHs,
    hashrateTHsMax: dayStatement.hashrateTHsMax,
    btcSellPrice: dayStatement.btcPrice,
    expenses: {
      electricity:
        dayStatement.partnaire === FinancialPartnaire.ELECTRICITY
          ? dayStatement.amount
          : { btc: 0, source: FinancialSource.NONE },
      csm:
        dayStatement.partnaire === FinancialPartnaire.CSM
          ? dayStatement.amount
          : { btc: 0, source: FinancialSource.NONE },
      operator:
        dayStatement.partnaire === FinancialPartnaire.OPERATOR
          ? dayStatement.amount
          : { btc: 0, source: FinancialSource.NONE },
      other:
        dayStatement.partnaire === FinancialPartnaire.OTHER
          ? dayStatement.amount
          : { btc: 0, source: FinancialSource.NONE },
    },
    income: {
      pool:
        dayStatement.partnaire === FinancialPartnaire.POOL
          ? dayStatement.amount
          : { btc: 0, source: FinancialSource.NONE },
      other:
        dayStatement.partnaire === FinancialPartnaire.OTHER
          ? dayStatement.amount
          : { btc: 0, source: FinancialSource.NONE },
    },
  };
}

export function convertMiningHistoryToMiningReport(
  miningDay: Database["public"]["Tables"]["mining"]["Row"],
  hashrateTHsMax: number,
  btcPrice?: number,
  electricityCost?: FinancialStatementAmount,
  csmCost?: FinancialStatementAmount,
  operatorCost?: FinancialStatementAmount,
  otherCost?: FinancialStatementAmount,
  otherIncome?: FinancialStatementAmount
): DailyMiningReport {
  const electricity = electricityCost ?? {
    btc: 0,
    source: FinancialSource.NONE,
  };
  const csm = csmCost ?? { btc: 0, source: FinancialSource.NONE };
  const operator = operatorCost ?? { btc: 0, source: FinancialSource.NONE };
  const otherOut = otherCost ?? { btc: 0, source: FinancialSource.NONE };
  const otherIn = otherIncome ?? { btc: 0, source: FinancialSource.NONE };
  return {
    day: convertToUTCStartOfDay(new Date(miningDay.day)),
    uptime: miningDay.uptime,
    hashrateTHs: miningDay.hashrateTHs,
    hashrateTHsMax: hashrateTHsMax,
    btcSellPrice: btcPrice ?? 0,
    expenses: {
      electricity: electricity,
      csm: csm,
      operator: operator,
      other: otherOut,
    },
    income: {
      pool: { btc: miningDay.mined, source: FinancialSource.STATEMENT },
      other: otherIn,
    },
  };
}
export enum FinancialSource {
  NONE = "none",
  POOL = "pool",
  SIMULATOR = "simulator",
  STATEMENT = "statement",
}

export function isValidFinancialSource(value: string): boolean {
  return Object.values(FinancialSource).includes(value as FinancialSource);
}
