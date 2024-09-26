import { Site } from "@/types/supabase.extend";
import {
  FinancialSource,
  FinancialStatementAmount,
} from "@/types/FinancialSatement";
import { convertDailyFinancialStatementToMiningReport } from "@/types/MiningReport";
import {
  DailyMiningReport,
  mergeMiningReportsOfTheDay,
} from "@/types/MiningReport";
import { Database } from "@/types/supabase";
import {
  aggregateFinancialStatements as aggregateFinancialStatementsByDay,
  getFinancialStatementsPeriod,
} from "./financialstatements";
import {
  convertToUTCStartOfDay,
  calculateDaysBetweenDates,
  convertDateToMapKey,
} from "./date";
import { getMiningHistoryByDay, getMiningHistoryPeriod } from "./mininghistory";
import { calculateSiteGrossIncome } from "./site";

export function getDailyMiningReportsOfSite(
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

    let miningReportFromStatement: DailyMiningReport | undefined = undefined;

    // get the financial statements if exists
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
  dayReport: DailyMiningReport | undefined,
  miningHistoryOfDay: Database["public"]["Tables"]["mining"]["Row"] | undefined,
  day: Date,
  site: Site,
  btcPrice: number
): DailyMiningReport {
  if (dayReport === undefined && miningHistoryOfDay === undefined) {
    // no data for the day
    dayReport = getEmptyDailyMiningReport(day);
  } else if (miningHistoryOfDay !== undefined) {
    // day has mining history
    const electricityCostBtc = dayReport?.expenses.electricity.btc;
    const simulationResult = calculateSiteGrossIncome(
      site,
      miningHistoryOfDay,
      btcPrice,
      electricityCostBtc
    );
    const dayReportFromPool = getDailyMiningReportFromPool(
      day,
      miningHistoryOfDay.uptime,
      miningHistoryOfDay.hashrateTHs,
      miningHistoryOfDay.mined,
      {
        btc: simulationResult.cost.electricity.btc,
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

    if (dayReport !== undefined) {
      // day has financial statements : merge the mining report from the pool with the financial statements
      dayReport = mergeMiningReportsOfTheDay(
        [dayReport, dayReportFromPool],
        miningHistoryOfDay.uptime,
        miningHistoryOfDay.hashrateTHs
      );
    } else {
      // day has no financial statements : use the mining report from the pool
      dayReport = dayReportFromPool;
    }
  } else if (dayReport !== undefined) {
    // do nothing : use the financial statements
  }
  return dayReport ?? getEmptyDailyMiningReport(day);
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
