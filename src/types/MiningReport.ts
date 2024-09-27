import { convertToUTCStartOfDay } from "@/tools/date";
import {
  DailyFinancialStatement,
  FinancialPartnaire,
  FinancialSource,
  FinancialStatementAmount,
} from "./FinancialSatement";
import { Database } from "./supabase";

export type DailyMiningReport = {
  day: Date;
  uptime: number;
  hashrateTHs: number;
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
export function convertDailyFinancialStatementToMiningReport(
  dayStatement: DailyFinancialStatement
): DailyMiningReport {
  return {
    day: convertToUTCStartOfDay(dayStatement.day),
    uptime: dayStatement.uptime,
    hashrateTHs: dayStatement.hashrateTHs,
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
