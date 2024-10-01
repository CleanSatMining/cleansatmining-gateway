import {
  addFinancialAmount,
  DailyFinancialStatement,
  FinancialSource,
  FinancialStatementAmount,
} from "@/types/FinancialSatement";
import { convertDailyFinancialStatementToMiningReport } from "@/types/MiningReport";
import { DailyMiningReport } from "@/types/MiningReport";
import { Database } from "@/types/supabase";

import { convertToUTCStartOfDay } from "./date";
import BigNumber from "bignumber.js";

export function filterMiningReportsByDay(
  miningReportByDay: Map<string, DailyMiningReport>,
  startDay: Date,
  endDay: Date
): void {
  miningReportByDay.forEach((report, key) => {
    if (report.day < startDay || report.day > endDay) {
      miningReportByDay.delete(key);
    }
  });
}

export function getEmptyDailyMiningReport(day: Date): DailyMiningReport {
  return {
    day: convertToUTCStartOfDay(day),
    uptime: 0,
    hashrateTHs: 0,
    btcSellPrice: 1,
    expenses: {
      electricity: { btc: 0, source: FinancialSource.NONE },
      csm: { btc: 0, source: FinancialSource.NONE },
      operator: { btc: 0, source: FinancialSource.NONE },
      other: { btc: 0, source: FinancialSource.NONE },
    },
    income: {
      pool: { btc: 0, source: FinancialSource.NONE },
      other: { btc: 0, source: FinancialSource.NONE },
    },
  };
}
export function getDailyMiningReportFromPool(
  day: Date,
  uptime: number,
  hashrateTHs: number,
  btc: number,
  btcPrice: number,
  electricityCost?: FinancialStatementAmount,
  csmCost?: FinancialStatementAmount,
  operatorCost?: FinancialStatementAmount,
  otherCost?: FinancialStatementAmount,
  otherIncome?: FinancialStatementAmount
): DailyMiningReport {
  return {
    day: convertToUTCStartOfDay(day),
    uptime: uptime,
    hashrateTHs: hashrateTHs,
    btcSellPrice: btcPrice,
    expenses: {
      electricity: electricityCost ?? { btc: 0, source: FinancialSource.NONE },
      csm: csmCost ?? { btc: 0, source: FinancialSource.NONE },
      operator: operatorCost ?? { btc: 0, source: FinancialSource.NONE },
      other: otherCost ?? { btc: 0, source: FinancialSource.NONE },
    },
    income: {
      pool: { btc: btc, source: FinancialSource.POOL },
      other: otherIncome ?? { btc: 0, source: FinancialSource.NONE },
    },
  };
}

export function mergeDayStatementsIntoMiningReport(
  dayStatements: DailyFinancialStatement[],
  miningHistoryOfDay: Database["public"]["Tables"]["mining"]["Row"] | undefined
): DailyMiningReport | undefined {
  const dayStatementMiningReports = dayStatements.map((statement) => {
    return convertDailyFinancialStatementToMiningReport(statement);
  });

  if (dayStatementMiningReports.length === 0) {
    // No financial statements for the day
    return undefined;
  } else {
    const miningReportFromStatement = mergeDayStatmentsMiningReports(
      dayStatementMiningReports,
      miningHistoryOfDay?.uptime,
      miningHistoryOfDay?.hashrateTHs
    );
    return miningReportFromStatement;
  }
}

function mergeDayStatmentsMiningReports(
  dayReports: DailyMiningReport[],
  dayUptime?: number,
  dayHashrateTHs?: number
): DailyMiningReport {
  if (dayReports.length === 0) {
    throw new Error("Day Statments : Cannot merge empty Mining Report");
  }
  if (dayReports.length === 1) {
    return dayReports[0];
  }
  if (
    dayReports[0].day.getUTCFullYear() !== dayReports[1].day.getUTCFullYear() &&
    dayReports[0].day.getUTCMonth() !== dayReports[1].day.getUTCMonth() &&
    dayReports[0].day.getUTCDate() !== dayReports[1].day.getUTCDate()
  ) {
    throw new Error("Cannot merge Mining Report for different days");
  }
  if (
    dayUptime === undefined &&
    dayReports[0].uptime !== dayReports[1].uptime
  ) {
    throw new Error("Cannot merge Mining Report for different uptime");
  }
  if (
    dayHashrateTHs === undefined &&
    dayReports[0].hashrateTHs !== dayReports[1].hashrateTHs
  ) {
    throw new Error("Cannot merge Mining Report for different hashrate");
  }

  const sum: DailyMiningReport = {
    day: dayReports[0].day, // Assuming the day is the same for both accounts
    uptime: dayUptime ?? dayReports[0].uptime, // Assuming the uptime is the same for both accounts
    hashrateTHs: dayHashrateTHs ?? dayReports[0].hashrateTHs, // Assuming the hashrate is the same for both accounts
    btcSellPrice: dayReports[0].btcSellPrice,
    expenses: {
      electricity: addFinancialAmount(
        dayReports[0].expenses.electricity,
        dayReports[1].expenses.electricity
      ),
      csm: addFinancialAmount(
        dayReports[0].expenses.csm,
        dayReports[1].expenses.csm
      ),
      operator: addFinancialAmount(
        dayReports[0].expenses.operator,
        dayReports[1].expenses.operator
      ),
      other: addFinancialAmount(
        dayReports[0].expenses.other,
        dayReports[1].expenses.other
      ),
    },
    income: {
      pool: addFinancialAmount(
        dayReports[0].income.pool,
        dayReports[1].income.pool
      ),
      other: addFinancialAmount(
        dayReports[0].income.other,
        dayReports[1].income.other
      ),
    },
  };

  if (dayReports.length === 2) {
    return sum;
  } else {
    return mergeDayStatmentsMiningReports(
      [sum, ...dayReports.slice(2)],
      dayUptime,
      dayHashrateTHs
    );
  }
}

export function mergeDayMiningReport(
  dayReports: DailyMiningReport[]
): DailyMiningReport {
  if (dayReports.length === 0) {
    throw new Error("Day Mining reports : Cannot merge empty Mining Report");
  }
  if (dayReports.length === 1) {
    return dayReports[0];
  }
  if (
    dayReports[0].day.getUTCFullYear() !== dayReports[1].day.getUTCFullYear() &&
    dayReports[0].day.getUTCMonth() !== dayReports[1].day.getUTCMonth() &&
    dayReports[0].day.getUTCDate() !== dayReports[1].day.getUTCDate()
  ) {
    throw new Error("Cannot merge Mining Report for different days");
  }

  const hashrateWeight =
    dayReports[0].hashrateTHs > 0 && dayReports[0].hashrateTHs > 0
      ? dayReports[0].hashrateTHs + dayReports[1].hashrateTHs
      : 1;
  const hashrateTHs = dayReports[0].hashrateTHs + dayReports[1].hashrateTHs;
  const uptime = new BigNumber(dayReports[0].uptime)
    .times(dayReports[0].hashrateTHs)
    .plus(new BigNumber(dayReports[1].uptime).times(dayReports[1].hashrateTHs))
    .dividedBy(hashrateWeight)
    .toNumber();

  const sum: DailyMiningReport = {
    day: dayReports[0].day, // Assuming the day is the same for both accounts
    uptime: uptime,
    hashrateTHs: hashrateTHs,
    btcSellPrice: dayReports[0].btcSellPrice,
    expenses: {
      electricity: addFinancialAmount(
        dayReports[0].expenses.electricity,
        dayReports[1].expenses.electricity
      ),
      csm: addFinancialAmount(
        dayReports[0].expenses.csm,
        dayReports[1].expenses.csm
      ),
      operator: addFinancialAmount(
        dayReports[0].expenses.operator,
        dayReports[1].expenses.operator
      ),
      other: addFinancialAmount(
        dayReports[0].expenses.other,
        dayReports[1].expenses.other
      ),
    },
    income: {
      pool: addFinancialAmount(
        dayReports[0].income.pool,
        dayReports[1].income.pool
      ),
      other: addFinancialAmount(
        dayReports[0].income.other,
        dayReports[1].income.other
      ),
    },
  };

  if (dayReports.length === 2) {
    return sum;
  } else {
    return mergeDayMiningReport([sum, ...dayReports.slice(2)]);
  }
}

export function mergeMiningReports(
  miningReports: Map<string, DailyMiningReport>[]
): Map<string, DailyMiningReport> {
  if (miningReports.length === 0) {
    throw new Error("Mining reports : Cannot merge empty Mining Report");
  }
  if (miningReports.length === 1) {
    return miningReports[0];
  }

  const mergedReports = new Map<string, DailyMiningReport>();

  miningReports.forEach((map) => {
    map.forEach((value, key) => {
      if (mergedReports.has(key)) {
        const existingReport = mergedReports.get(key);
        if (existingReport) {
          const mergedReport = mergeDayMiningReport([existingReport, value]);
          mergedReports.set(key, mergedReport);
        }
      } else {
        mergedReports.set(key, value);
      }
    });
  });

  return mergedReports;
}
