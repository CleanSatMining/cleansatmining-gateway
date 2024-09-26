import { convertToUTCStartOfDay } from "@/tools/date";
import {
  addFinancialAmount,
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
export function mergeMiningReportsOfTheDay(
  accounts: DailyMiningReport[],
  uptime?: number,
  hashrateTHs?: number
): DailyMiningReport {
  if (accounts.length === 0) {
    throw new Error("Cannot merge empty Mining Report");
  }
  if (accounts.length === 1) {
    return accounts[0];
  }
  if (
    accounts[0].day.getUTCFullYear() !== accounts[1].day.getUTCFullYear() &&
    accounts[0].day.getUTCMonth() !== accounts[1].day.getUTCMonth() &&
    accounts[0].day.getUTCDate() !== accounts[1].day.getUTCDate()
  ) {
    throw new Error("Cannot merge Mining Report for different days");
  }
  if (uptime === undefined && accounts[0].uptime !== accounts[1].uptime) {
    throw new Error("Cannot merge Mining Report for different uptime");
  }
  if (
    hashrateTHs === undefined &&
    accounts[0].hashrateTHs !== accounts[1].hashrateTHs
  ) {
    throw new Error("Cannot merge Mining Report for different hashrate");
  }

  const sum = {
    day: accounts[0].day, // Assuming the day is the same for both accounts
    uptime: uptime ?? accounts[0].uptime, // Assuming the uptime is the same for both accounts
    hashrateTHs: hashrateTHs ?? accounts[0].hashrateTHs, // Assuming the hashrate is the same for both accounts
    expenses: {
      electricity: addFinancialAmount(
        accounts[0].expenses.electricity,
        accounts[1].expenses.electricity
      ),
      csm: addFinancialAmount(
        accounts[0].expenses.csm,
        accounts[1].expenses.csm
      ),
      operator: addFinancialAmount(
        accounts[0].expenses.operator,
        accounts[1].expenses.operator
      ),
      other: addFinancialAmount(
        accounts[0].expenses.other,
        accounts[1].expenses.other
      ),
    },
    income: {
      pool: addFinancialAmount(
        accounts[0].income.pool,
        accounts[1].income.pool
      ),
      other: addFinancialAmount(
        accounts[0].income.other,
        accounts[1].income.other
      ),
    },
  };

  if (accounts.length === 2) {
    return sum;
  } else {
    return mergeMiningReportsOfTheDay(
      [sum, ...accounts.slice(2)],
      uptime,
      hashrateTHs
    );
  }
}
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
