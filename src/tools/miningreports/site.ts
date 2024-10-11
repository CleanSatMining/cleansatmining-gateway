import { DailyFinancialStatement } from "@/types/FinancialSatement";
import { FinancialSource } from "@/types/MiningReport";
import { DailyMiningReport } from "@/types/MiningReport";
import { Database } from "@/types/supabase";
import { Site } from "@/types/supabase.extend";
import {
  getYesterdayDate,
  convertToUTCStartOfDay,
  calculateDaysBetweenDates,
  convertDateToKey,
  getTodayDate,
} from "../date";
import {
  getFinancialStatementsPeriod,
  aggregateFinancialStatementsByDay,
} from "../financialstatements/financialstatement.commons";
import { getMiningHistoryPeriod } from "../mininghistory/mininghistory.common";
import { getSiteMiningHistoryByDay } from "../mininghistory/site";
import {
  filterMiningReportsByDay,
  getDailyMiningReportFromPool,
  mergeDayStatementsIntoMiningReport,
  getEmptyDailyMiningReport,
} from "./miningreport";
import { calculateSiteGrossIncome } from "../site";

export function getSiteDailyMiningReports(
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  site: Site,
  btcPrice: number,
  startDay: Date | undefined = undefined,
  endDay: Date = getTodayDate()
): DailyMiningReport[] {
  if (site.started_at === undefined || site.started_at === null) {
    return [];
  }

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
  _financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  _miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  site: Site,
  btcPrice: number,
  start_param: Date | undefined = undefined,
  end_param: Date | undefined = undefined
): Map<string, DailyMiningReport> {
  const miningReportByDay: Map<string, DailyMiningReport> = new Map();

  if (site.started_at === undefined || site.started_at === null) {
    // site has not started yet
    return miningReportByDay;
  }

  const miningHistory = _miningHistory.filter(
    (history) => history.siteSlug === site.slug
  );
  const financialStatements = _financialStatements.filter(
    (statement) => statement.siteSlug === site.slug
  );

  // get the mining history data by day
  const miningHistoryByDay = getSiteMiningHistoryByDay(miningHistory, site);

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
  const siteStart: Date = new Date(site.started_at);
  const siteEnd: Date = site.closed_at
    ? new Date(site.closed_at)
    : getTodayDate();

  // date input cannot exede the site period
  const startParam: Date | undefined = start_param
    ? start_param < siteStart
      ? siteStart
      : start_param
    : undefined;
  const endParam: Date | undefined = end_param
    ? end_param > siteEnd
      ? siteEnd
      : end_param
    : undefined;

  // get the longest period between the data and the parameters
  const startInput: Date = startParam ?? siteStart;
  const endInput: Date = endParam ?? siteEnd;

  // get the extended period of data
  const extentedEnd: Date = endData ?? endInput;
  const extendedStart: Date = startData ?? startInput;

  // get the total number of days between the start and end of the data
  const totalDays = calculateDaysBetweenDates(extendedStart, extentedEnd);

  // aggregate the daily financial statement for each day of the financial statements
  const financialStatementsByDay = aggregateFinancialStatementsByDay(
    financialStatements,
    miningHistory
  );

  // get the daily financial statement for each day of the financial statements
  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const day = new Date(extendedStart);
    day.setUTCDate(day.getUTCDate() + dayIndex);
    const dayKey = convertDateToKey(day);

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
  console.log(
    "=> Mining Report Filter",
    startParam ?? extendedStart,
    endParam ?? extentedEnd
  );
  filterMiningReportsByDay(
    miningReportByDay,
    startParam ?? extendedStart,
    endParam ?? extentedEnd
  );

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
