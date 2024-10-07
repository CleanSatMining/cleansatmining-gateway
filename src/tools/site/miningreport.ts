import {
  FinancialSource,
  DailyFinancialStatement,
} from "@/types/FinancialSatement";
import { DailyMiningReport } from "@/types/MiningReport";
import { Database } from "@/types/supabase";
import { Site } from "@/types/supabase.extend";
import {
  getYesterdayDate,
  convertToUTCStartOfDay,
  calculateDaysBetweenDates,
  convertDateToMapKey,
  getTodayDate,
} from "../date";
import {
  getFinancialStatementsPeriod,
  aggregateFinancialStatementsByDay,
} from "../financialstatements";
import {
  getMiningHistoryByDay,
  getMiningHistoryPeriod,
} from "../mininghistory";
import {
  filterMiningReportsByDay,
  getDailyMiningReportFromPool,
  mergeDayStatementsIntoMiningReport,
  getEmptyDailyMiningReport,
} from "../miningreport";
import { calculateSiteGrossIncome } from "../site";

export function getSiteDailyMiningReports(
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  site: Site,
  btcPrice: number,
  startDay: Date | undefined = undefined,
  endDay: Date = getTodayDate()
): DailyMiningReport[] {
  const miningReportByDay = getSiteMiningReportsByDay(
    financialStatements,
    miningHistory,
    site,
    btcPrice,
    startDay,
    endDay
  );

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

export function getSiteMiningReportsByDay(
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  site: Site,
  btcPrice: number,
  start_param: Date | undefined = undefined,
  end_param: Date = getTodayDate()
): Map<string, DailyMiningReport> {
  const miningReportByDay: Map<string, DailyMiningReport> = new Map();

  // get the mining history data by day
  const miningHistoryByDay = getMiningHistoryByDay(miningHistory, site);

  // get the period of the financial statements and the mining history
  const { start: starthistory, end: endhistory } =
    getMiningHistoryPeriod(miningHistory);
  const { start: startstatement, end: endstatement } =
    getFinancialStatementsPeriod(financialStatements);

  // get the longest period between the financial statements and the mining history
  const startData: Date | undefined =
    startstatement && starthistory
      ? starthistory > startstatement
        ? startstatement
        : starthistory
      : startstatement ?? starthistory;
  const endData: Date | undefined =
    endstatement && endhistory
      ? endhistory < endstatement
        ? endstatement
        : endhistory
      : endstatement ?? endhistory;

  // get the longest period between the data and the parameters
  const end: Date =
    endData && end_param
      ? endData < end_param
        ? convertToUTCStartOfDay(end_param)
        : endData
      : endData ?? end_param ?? getTodayDate();
  const start: Date =
    start_param && startData
      ? start_param < startData
        ? convertToUTCStartOfDay(start_param)
        : startData
      : startData ?? start_param ?? end;

  // get the total number of days between the start and end of the financial statements
  const totalDays = calculateDaysBetweenDates(start, end);

  console.log("mining report start", start);
  console.log("mining report end", end, endstatement, endhistory, end_param);
  console.log("mining report totalDays", totalDays);

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
    const dayMiningHistory = miningHistoryByDay.get(dayKey);

    // get the financial statements if exists
    const dayStatements = financialStatementsByDay.get(dayKey) ?? [];

    // aggregate the data from the mining history and the financial statements
    const miningReportOfTheDay = aggregateSiteMiningReportData(
      dayStatements,
      dayMiningHistory,
      day,
      site,
      btcPrice
    );

    miningReportByDay.set(dayKey, miningReportOfTheDay);
  }

  // filter the daily accounting by date
  filterMiningReportsByDay(miningReportByDay, start, end);

  return miningReportByDay;
}
export function getSiteDayMiningReportFromPool(
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
    btcPrice,
    {
      btc: simulationResult.cost.electricity.total.btc,
      usd: simulationResult.cost.electricity.total.usd,
      source: FinancialSource.SIMULATOR,
    },
    {
      btc: simulationResult.cost.csm.btc,
      usd: simulationResult.cost.csm.usd,
      source: FinancialSource.SIMULATOR,
    },
    {
      btc: simulationResult.cost.operator.btc,
      usd: simulationResult.cost.operator.usd,
      source: FinancialSource.SIMULATOR,
    }
  );
  return dayReportFromPool;
}
function aggregateSiteMiningReportData(
  dayStatements: DailyFinancialStatement[],
  dayMiningHistory: Database["public"]["Tables"]["mining"]["Row"] | undefined,
  day: Date,
  site: Site,
  btcPrice: number
): DailyMiningReport {
  const dayMiningReportFromDayStatements = mergeDayStatementsIntoMiningReport(
    dayStatements,
    dayMiningHistory
  );

  if (dayMiningReportFromDayStatements !== undefined) {
    // day has financial statements : use the mining report from the financial statements
    // we suppose that the financial statements are complete
    return dayMiningReportFromDayStatements;
  } else if (dayMiningHistory !== undefined) {
    // day has no financial statements : use the mining report from the pool
    const dayReportFromPool = getSiteDayMiningReportFromPool(
      site,
      dayMiningHistory,
      btcPrice,
      day
    );

    return dayReportFromPool;
  } else {
    // no data for the day
    return getEmptyDailyMiningReport(day, btcPrice);
  }
}
