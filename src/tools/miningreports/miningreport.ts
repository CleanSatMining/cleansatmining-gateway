import {
  addFinancialAmount,
  addFinancialAmounts,
  addSourceFinancialAmount,
  DailyFinancialStatement,
  FinancialStatementAmount,
  substractFinancialAmount,
} from "@/types/FinancialSatement";
import { FinancialSource, MiningEquipment } from "@/types/MiningReport";
import { convertDailyFinancialStatementToMiningReport } from "@/types/MiningReport";
import { DailyMiningReport } from "@/types/MiningReport";
import { Database } from "@/types/supabase";

import { convertToUTCStartOfDay } from "../date";
import BigNumber from "bignumber.js";
import { concatUniqueAsics } from "../equipment/asics";

export function filterMiningReportsByDay(
  miningReportByDay: Map<string, DailyMiningReport>,
  startDay: Date,
  endDay: Date
): void {
  miningReportByDay.forEach((report, key) => {
    if (report.day < startDay || report.day >= endDay) {
      miningReportByDay.delete(key);
    }
  });
}

export function getEmptyDailyMiningReport(
  day: Date,
  dayEquipements?: MiningEquipment,
  btcSellPrice: number = 1
): DailyMiningReport {
  const emptyEquipements: MiningEquipment = {
    hashrateTHsMax: 0,
    powerWMax: 0,
    asics: [],
  };
  return {
    day: convertToUTCStartOfDay(day),
    uptime: 0,
    hashrateTHs: 0,
    btcSellPrice: btcSellPrice,
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
    revenue: { btc: 0, source: FinancialSource.NONE },
    equipements: dayEquipements ?? emptyEquipements,
  };
}
export function getDailyMiningReportFromPool(
  day: Date,
  uptime: number,
  hashrateTHs: number,
  minedbtc: number,
  btcPrice: number,
  equipements: MiningEquipment,
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
  const csm = csmCost ?? { btc: 0, source: FinancialSource.NONE, usd: 0 };
  const operator = operatorCost ?? {
    btc: 0,
    source: FinancialSource.NONE,
    usd: 0,
  };
  const otherOut = otherCost ?? {
    btc: 0,
    source: FinancialSource.NONE,
    usd: 0,
  };
  const otherIn = otherIncome ?? {
    btc: 0,
    source: FinancialSource.NONE,
    usd: 0,
  };
  const incomePool = {
    btc: minedbtc,
    source: FinancialSource.POOL,
    usd: new BigNumber(minedbtc).times(btcPrice).toNumber(),
  };
  const incomeOther = otherIncome ?? {
    btc: 0,
    source: FinancialSource.NONE,
    usd: 0,
  };
  const income = addFinancialAmounts([incomePool, incomeOther]);
  const expenses = addFinancialAmounts([electricity, csm, operator, otherOut]);
  const revenue = substractFinancialAmount(income, expenses);
  revenue.usd = new BigNumber(revenue.btc).times(btcPrice).toNumber();
  return {
    day: convertToUTCStartOfDay(day),
    uptime: uptime,
    hashrateTHs: hashrateTHs,
    btcSellPrice: btcPrice,
    expenses: {
      electricity: electricity,
      csm: csm,
      operator: operator,
      other: otherOut,
    },
    income: {
      pool: incomePool,
      other: otherIn,
    },
    revenue: revenue,
    equipements: equipements,
  };
}

/**
 * Merge daily financial statements into a mining report
 * The statements and the mining history must be for the same day
 * @param dayStatements statements of the day
 * @param miningHistoryOfDay  mining history of the day
 * @param dayEquipements
 * @returns
 */
export function mergeDayStatementsIntoMiningReport(
  dayStatements: DailyFinancialStatement[],
  dayEquipements: MiningEquipment,
  uptime?: number,
  hashrateTHs?: number
): DailyMiningReport | undefined {
  const dayStatementMiningReports = dayStatements.map((statement) => {
    return convertDailyFinancialStatementToMiningReport(
      statement,
      dayEquipements
    );
  });

  if (dayStatementMiningReports.length === 0) {
    // No financial statements for the day
    return undefined;
  } else {
    const miningReportFromStatement = mergeMultisourceDayStatmentsMiningReports(
      dayStatementMiningReports,
      dayEquipements,
      uptime,
      hashrateTHs
    );
    return miningReportFromStatement;
  }
}

function mergeMultisourceDayStatmentsMiningReports(
  dayReports: DailyMiningReport[],
  dayEquipements: MiningEquipment,
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

  const sumElec = addSourceFinancialAmount(
    dayReports[0].expenses.electricity,
    dayReports[1].expenses.electricity
  );

  const sumCsm = addSourceFinancialAmount(
    dayReports[0].expenses.csm,
    dayReports[1].expenses.csm
  );
  const sumOperator = addSourceFinancialAmount(
    dayReports[0].expenses.operator,
    dayReports[1].expenses.operator
  );
  const sumOtherExpenses = addSourceFinancialAmount(
    dayReports[0].expenses.other,
    dayReports[1].expenses.other
  );
  const sumPool = addSourceFinancialAmount(
    dayReports[0].income.pool,
    dayReports[1].income.pool
  );

  const sumOtherIncome = addSourceFinancialAmount(
    dayReports[0].income.other,
    dayReports[1].income.other
  );

  const income = addFinancialAmounts([sumPool, sumOtherIncome]);
  const expenses = addFinancialAmounts([
    sumElec,
    sumCsm,
    sumOperator,
    sumOtherExpenses,
  ]);
  const revenue = substractFinancialAmount(income, expenses);

  const sum: DailyMiningReport = {
    day: dayReports[0].day, // Assuming the day is the same for both accounts
    uptime: dayUptime ?? dayReports[0].uptime, // Assuming the uptime is the same for both accounts
    hashrateTHs: dayHashrateTHs ?? dayReports[0].hashrateTHs, // Assuming the hashrate is the same for both accounts
    btcSellPrice: dayReports[0].btcSellPrice,
    expenses: {
      electricity: sumElec,
      csm: sumCsm,
      operator: sumOperator,
      other: sumOtherExpenses,
    },
    income: {
      pool: sumPool,
      other: sumOtherIncome,
    },
    revenue: revenue,
    equipements: dayEquipements,
  };

  if (dayReports.length === 2) {
    return sum;
  } else {
    return mergeMultisourceDayStatmentsMiningReports(
      [sum, ...dayReports.slice(2)],
      dayEquipements,
      dayUptime,
      dayHashrateTHs
    );
  }
}

/**
 * Merge mining reports for the same day
 * The reports concern different equipements
 * @param dayReports
 * @returns
 */
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
  // verify that the report has not the same equipements
  const containerIds_0 = dayReports[0].equipements.asics.map(
    (asic) => asic.containerId
  );
  const containerIds_1 = dayReports[1].equipements.asics.map(
    (asic) => asic.containerId
  );
  const intersection = containerIds_0.filter((id) =>
    containerIds_1.includes(id)
  );
  if (intersection.length > 0) {
    throw new Error("Cannot merge Mining Report for same equipements");
  }

  const hashrateTHs = dayReports[0].hashrateTHs + dayReports[1].hashrateTHs;
  const hashrateTHsMax =
    dayReports[0].equipements.hashrateTHsMax +
    dayReports[1].equipements.hashrateTHsMax;
  const uptime =
    hashrateTHsMax > 0
      ? new BigNumber(hashrateTHs).dividedBy(hashrateTHsMax).toNumber()
      : 0;

  const bySite: { [key: string]: any } = {};
  if (dayReports[0].site !== undefined) {
    bySite[dayReports[0].site] = dayReports[0];
  }
  if (dayReports[1].site !== undefined) {
    bySite[dayReports[1].site] = dayReports[1];
  }
  if (dayReports[0].bySite !== undefined) {
    Object.keys(dayReports[0].bySite).forEach((key) => {
      if (dayReports[0].bySite) bySite[key] = dayReports[0].bySite[key];
    });
  }
  if (dayReports[1].bySite !== undefined) {
    Object.keys(dayReports[1].bySite).forEach((key) => {
      if (dayReports[1].bySite) bySite[key] = dayReports[1].bySite[key];
    });
  }

  // merge asics and deduplicate by container
  const asics = concatUniqueAsics(
    dayReports[0].equipements.asics,
    dayReports[1].equipements.asics
  );

  const equipements: MiningEquipment = {
    hashrateTHsMax: hashrateTHsMax,
    powerWMax:
      dayReports[0].equipements.powerWMax + dayReports[1].equipements.powerWMax,
    asics: asics,
  };

  const sumElec = addFinancialAmount(
    dayReports[0].expenses.electricity,
    dayReports[1].expenses.electricity
  );

  const sumCsm = addFinancialAmount(
    dayReports[0].expenses.csm,
    dayReports[1].expenses.csm
  );
  const sumOperator = addFinancialAmount(
    dayReports[0].expenses.operator,
    dayReports[1].expenses.operator
  );
  const sumOtherExpenses = addFinancialAmount(
    dayReports[0].expenses.other,
    dayReports[1].expenses.other
  );
  const sumPool = addFinancialAmount(
    dayReports[0].income.pool,
    dayReports[1].income.pool
  );

  const sumOtherIncome = addFinancialAmount(
    dayReports[0].income.other,
    dayReports[1].income.other
  );

  const income = addFinancialAmounts([sumPool, sumOtherIncome]);
  const expenses = addFinancialAmounts([
    sumElec,
    sumCsm,
    sumOperator,
    sumOtherExpenses,
  ]);
  const revenue = substractFinancialAmount(income, expenses);

  const sum: DailyMiningReport = {
    day: dayReports[0].day, // Assuming the day is the same for both accounts
    site: undefined,
    uptime: uptime,
    hashrateTHs: hashrateTHs,
    btcSellPrice: dayReports[0].btcSellPrice,
    expenses: {
      electricity: sumElec,
      csm: sumCsm,
      operator: sumOperator,
      other: sumOtherExpenses,
    },
    income: {
      pool: sumPool,
      other: sumOtherIncome,
    },
    revenue: revenue,
    bySite: bySite,
    equipements: equipements,
  };

  if (dayReports.length === 2) {
    return sum;
  } else {
    return mergeDayMiningReport([sum, ...dayReports.slice(2)]);
  }
}

/**
 * Merge daily mining reports
 * The reports concern different days
 * The merged report will contain a report by day
 * @param miningReports list of maps of daily mining reports to be merged
 * @returns
 */
export function mergeMiningReports(
  miningReports: Map<string, DailyMiningReport>[]
): Map<string, DailyMiningReport> {
  if (miningReports.length === 0) {
    throw new Error("Mining reports : Cannot merge empty Mining Report");
  }
  /*if (miningReports.length === 1) {
    return miningReports[0];
  }*/

  const mergedReports = new Map<string, DailyMiningReport>();

  miningReports.forEach((map) => {
    map.forEach((newReport, day) => {
      if (mergedReports.has(day)) {
        const existingReport = mergedReports.get(day);
        if (existingReport) {
          const mergedReport = mergeDayMiningReport([
            existingReport,
            newReport,
          ]);
          mergedReports.set(day, mergedReport);
        }
      } else {
        if (newReport.site !== undefined) {
          //console.log("=> by site", newReport.site);
          // copy newReport
          const newReportCopy = JSON.parse(JSON.stringify(newReport));
          const bySite: { [key: string]: any } = {};
          bySite[newReport.site] = newReportCopy;
          newReport.bySite = bySite;
          newReport.site = undefined;
        }
        mergedReports.set(day, newReport);
      }
    });
  });

  return mergedReports;
}

export function getDailyMiningReportsPeriod(reports: DailyMiningReport[]): {
  start: Date | undefined;
  end: Date | undefined;
} {
  if (reports.length === 0) {
    return { start: undefined, end: undefined };
  }

  const start = new Date(
    reports.reduce((acc, statement) => {
      return acc < new Date(statement.day) ? acc : new Date(statement.day);
    }, new Date())
  );
  const end = new Date(
    reports.reduce((acc, statement) => {
      return acc > new Date(statement.day) ? acc : new Date(statement.day);
    }, start)
  );

  // end date finish at 00:00:00, we need to add one day
  end.setDate(end.getDate() + 1);

  return { start, end };
}
