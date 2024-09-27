import { Site } from "@/types/supabase.extend";
import {
  addFinancialAmount,
  FinancialSource,
  FinancialStatementAmount,
} from "@/types/FinancialSatement";
import { convertDailyFinancialStatementToMiningReport } from "@/types/MiningReport";
import { DailyMiningReport } from "@/types/MiningReport";
import { Database } from "@/types/supabase";
import {
  aggregateFinancialStatementsByDay as aggregateFinancialStatementsByDay,
  getFinancialStatementsPeriod,
} from "./financialstatements";
import {
  convertToUTCStartOfDay,
  calculateDaysBetweenDates,
  convertDateToMapKey,
} from "./date";
import { getMiningHistoryByDay, getMiningHistoryPeriod } from "./mininghistory";
import { calculateSiteGrossIncome } from "./site";

export function getSiteDailyMiningReports(
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  site: Site,
  btcPrice: number = 1,
  startDay: Date | undefined = undefined,
  endDay: Date = new Date()
): DailyMiningReport[] {
  const miningReportByDay: Map<string, DailyMiningReport> = new Map();

  // get the mining history data by day
  const miningHistoryByDay = getMiningHistoryByDay(miningHistory, site);

  // get the period of the financial statements
  const { start: starthistory, end: endhistory } =
    getMiningHistoryPeriod(miningHistory);
  const { start: startstatement, end: endstatement } =
    getFinancialStatementsPeriod(financialStatements);
  const startData =
    starthistory < startstatement ? starthistory : startstatement;
  const endData = endhistory > endstatement ? endhistory : endstatement;

  const start =
    startDay && startData < startDay
      ? convertToUTCStartOfDay(startDay)
      : startData;
  const end = endDay > endData ? convertToUTCStartOfDay(endDay) : endData;

  // get the total number of days between the start and end of the financial statements
  const totalDays = calculateDaysBetweenDates(new Date(start), new Date(end));

  // aggregate the daily financial statement for each day of the financial statements
  const financialStatementsByDay = aggregateFinancialStatementsByDay(
    financialStatements,
    miningHistory
  );

  // get the daily financial statement for each day of the financial statements
  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + dayIndex);
    const dayKey = convertDateToMapKey(day);

    // get the mining history if exists
    const miningHistoryOfDay = miningHistoryByDay.get(dayKey);

    // get the financial statements if exists
    let miningReportFromStatement: DailyMiningReport | undefined = undefined;
    if (financialStatementsByDay.has(dayKey)) {
      const statementsOfTheDay = financialStatementsByDay.get(dayKey) ?? [];
      const reportsOfTheDay = statementsOfTheDay.map((statement) => {
        return convertDailyFinancialStatementToMiningReport(statement);
      });
      miningReportFromStatement = mergeMiningReportsOfTheDay(
        reportsOfTheDay,
        miningHistoryOfDay?.uptime,
        miningHistoryOfDay?.hashrateTHs
      );
    }

    // aggregate the data from the mining history and the financial statements
    const miningReportOfTheDay = aggregateMiningReportData(
      miningReportFromStatement,
      miningHistoryOfDay,
      day,
      site,
      btcPrice
    );

    miningReportByDay.set(dayKey, miningReportOfTheDay);
  }

  const dailyMiningReport: DailyMiningReport[] = Array.from(
    miningReportByDay.values()
  );

  // sort the daily accounting by date
  const sortedDays = dailyMiningReport.sort((a, b) => {
    const dateA = new Date(a.day);
    const dateB = new Date(b.day);
    return dateA.getTime() - dateB.getTime();
  });

  return sortedDays.filter((report) => {
    return (
      (startDay === undefined || report.day >= startDay) && report.day <= endDay
    );
  });
}

function aggregateMiningReportData(
  financialStatementReport: DailyMiningReport | undefined,
  miningHistoryOfDay: Database["public"]["Tables"]["mining"]["Row"] | undefined,
  day: Date,
  site: Site,
  btcPrice: number
): DailyMiningReport {
  if (financialStatementReport !== undefined) {
    // day has financial statements : use the mining report from the financial statements
    // we suppose that the financial statements are complete
    return financialStatementReport;
  } else if (miningHistoryOfDay !== undefined) {
    // day has no financial statements : use the mining report from the pool

    const dayReportFromPool = getSiteDayMiningReportFromPool(
      site,
      miningHistoryOfDay,
      btcPrice,
      day
    );

    return dayReportFromPool;
  } else {
    // no data for the day
    return getEmptyDailyMiningReport(day);
  }
}

function getSiteDayMiningReportFromPool(
  site: Site,
  miningHistoryOfDay: Database["public"]["Tables"]["mining"]["Row"],
  btcPrice: number,
  day: Date
) {
  const simulationResult = calculateSiteGrossIncome(
    site,
    miningHistoryOfDay,
    btcPrice
  );
  const dayReportFromPool = getDailyMiningReportFromPool(
    day,
    miningHistoryOfDay.uptime,
    miningHistoryOfDay.hashrateTHs,
    miningHistoryOfDay.mined,
    {
      btc: simulationResult.cost.electricity.total.btc,
      source: FinancialSource.SIMULATOR,
    },
    {
      btc: simulationResult.cost.csm.btc,
      source: FinancialSource.SIMULATOR,
    },
    {
      btc: simulationResult.cost.operator.btc,
      source: FinancialSource.SIMULATOR,
    }
  );
  return dayReportFromPool;
}

function getEmptyDailyMiningReport(day: Date): DailyMiningReport {
  return {
    day: convertToUTCStartOfDay(day),
    uptime: 0,
    hashrateTHs: 0,
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
function getDailyMiningReportFromPool(
  day: Date,
  uptime: number,
  hashrateTHs: number,
  btc: number,
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
export function mergeMiningReportsOfTheDay(
  reports: DailyMiningReport[],
  uptime?: number,
  hashrateTHs?: number
): DailyMiningReport {
  if (reports.length === 0) {
    throw new Error("Cannot merge empty Mining Report");
  }
  if (reports.length === 1) {
    return reports[0];
  }
  if (
    reports[0].day.getUTCFullYear() !== reports[1].day.getUTCFullYear() &&
    reports[0].day.getUTCMonth() !== reports[1].day.getUTCMonth() &&
    reports[0].day.getUTCDate() !== reports[1].day.getUTCDate()
  ) {
    throw new Error("Cannot merge Mining Report for different days");
  }
  if (uptime === undefined && reports[0].uptime !== reports[1].uptime) {
    throw new Error("Cannot merge Mining Report for different uptime");
  }
  if (
    hashrateTHs === undefined &&
    reports[0].hashrateTHs !== reports[1].hashrateTHs
  ) {
    throw new Error("Cannot merge Mining Report for different hashrate");
  }

  const sum = {
    day: reports[0].day, // Assuming the day is the same for both accounts
    uptime: uptime ?? reports[0].uptime, // Assuming the uptime is the same for both accounts
    hashrateTHs: hashrateTHs ?? reports[0].hashrateTHs, // Assuming the hashrate is the same for both accounts
    expenses: {
      electricity: addFinancialAmount(
        reports[0].expenses.electricity,
        reports[1].expenses.electricity
      ),
      csm: addFinancialAmount(reports[0].expenses.csm, reports[1].expenses.csm),
      operator: addFinancialAmount(
        reports[0].expenses.operator,
        reports[1].expenses.operator
      ),
      other: addFinancialAmount(
        reports[0].expenses.other,
        reports[1].expenses.other
      ),
    },
    income: {
      pool: addFinancialAmount(reports[0].income.pool, reports[1].income.pool),
      other: addFinancialAmount(
        reports[0].income.other,
        reports[1].income.other
      ),
    },
  };

  if (reports.length === 2) {
    return sum;
  } else {
    return mergeMiningReportsOfTheDay(
      [sum, ...reports.slice(2)],
      uptime,
      hashrateTHs
    );
  }
}
