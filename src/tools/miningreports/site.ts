import {
  DailyFinancialStatement,
  FinancialPartnaire,
  FinancialStatementAmount,
} from "@/types/FinancialSatement";
import {
  DailySiteMiningReport,
  FinancialSource,
  mapDailyMiningReportToSiteMiningReport,
} from "@/types/MiningReport";
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
import { getFinancialStatementsPeriod } from "../financialstatements/financialstatement.commons";
import { aggregateSiteFinancialStatementsByDay } from "../financialstatements/site";
import { getMiningHistoryPeriod } from "../mininghistory/mininghistory.common";
import { getSiteMiningHistoryByDay } from "../mininghistory/site";
import {
  filterMiningReportsByDay,
  getDailyMiningReportFromPool,
  mergeDayStatementsIntoMiningReport,
  getEmptyDailyMiningReport,
} from "./miningreport";
import { calculateSiteGrossIncome } from "../site";
import { getSiteEquipments } from "../equipment/site";

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
  end_param: Date | undefined = undefined,
  withDetails: boolean = false
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

  // get the start consign (default is the site active dates)
  const startInput: Date = start_param ?? siteStart;
  const endInput: Date = end_param ?? siteEnd;

  // data date cannot exede the site period
  const realStartData: Date | undefined = startData
    ? startData < siteStart
      ? siteStart
      : startData
    : undefined;
  const realEndData: Date | undefined = endData
    ? endData > siteEnd
      ? siteEnd
      : endData
    : undefined;

  // get the extended period of data
  const extentedEnd: Date =
    realEndData && realEndData.getTime() > endInput.getTime()
      ? realEndData
      : endInput;
  const extendedStart: Date =
    realStartData && realStartData.getTime() < startInput.getTime()
      ? realStartData
      : startInput;

  // get the total number of days between the start and end of the data
  const totalDays = calculateDaysBetweenDates(extendedStart, extentedEnd);

  // aggregate the daily financial statement for each day of the financial statements
  const financialStatementsByDay = aggregateSiteFinancialStatementsByDay(
    site,
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
    const miningReportOfTheDay = aggregateSiteDayMiningReportData(
      dayStatements,
      dayMiningHistory,
      day,
      site,
      btcPrice
    );

    if (withDetails) {
      miningReportOfTheDay.site = site.slug;
    } else {
      miningReportOfTheDay.site = undefined;
    }

    miningReportByDay.set(dayKey, miningReportOfTheDay);
  }

  // filter the daily accounting by date
  filterMiningReportsByDay(
    miningReportByDay,
    start_param ?? extendedStart,
    end_param ?? extentedEnd
  );

  return miningReportByDay;
}

export function getSiteDayMiningReportFromPool(
  site: Site,
  miningHistoryOfDay: Database["public"]["Tables"]["mining"]["Row"],
  btcPrice: number,
  day: Date,
  electricityCost?: FinancialStatementAmount
) {
  const simulationResult = calculateSiteGrossIncome(
    site,
    miningHistoryOfDay,
    btcPrice,
    electricityCost?.btc
  );

  const equipements = getSiteEquipments(site, day);

  const dayReportFromPool = getDailyMiningReportFromPool(
    day,
    miningHistoryOfDay.uptime,
    miningHistoryOfDay.hashrateTHs,
    miningHistoryOfDay.mined,
    btcPrice,
    equipements,
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

/**
 * Aggregate the data from the financial statements and the mining history of a given day
 * @param dayStatements financial statements of the day
 * @param dayMiningHistory mining history of the day
 * @param day date of the day
 * @param site site of the data
 * @param btcPrice price of bitcoin
 * @returns
 */
function aggregateSiteDayMiningReportData(
  dayStatements: DailyFinancialStatement[],
  dayMiningHistory: Database["public"]["Tables"]["mining"]["Row"] | undefined,
  day: Date,
  site: Site,
  btcPrice: number
): DailyMiningReport {
  const equipements = getSiteEquipments(site, day);

  const dayMiningReportFromDayStatements = mergeDayStatementsIntoMiningReport(
    dayStatements,
    equipements,
    dayMiningHistory?.uptime,
    dayMiningHistory?.hashrateTHs
  );

  if (dayMiningReportFromDayStatements !== undefined) {
    // verify that the statements of the day are complete (one per provider)
    const providers: string[] = Object.values(FinancialPartnaire);
    const dayStatementsProviders = dayStatements.map((statement) =>
      statement.partnaire.toString()
    );

    //get all the provider not in the statements
    const missingProviders = providers.filter(
      (provider) => !dayStatementsProviders.includes(provider)
    );

    if (missingProviders.length > 0 && dayMiningHistory !== undefined) {
      // the statements are incomplete : use the mining report from the pool

      console.log(
        "=> WARN Statements " +
          site.slug +
          " missing providers for day " +
          day.toISOString(),
        JSON.stringify(missingProviders, null, 2)
      );

      const dayReportFromPool = mapDailyMiningReportToSiteMiningReport(
        getSiteDayMiningReportFromPool(
          site,
          dayMiningHistory,
          btcPrice,
          day,
          dayMiningReportFromDayStatements.expenses.electricity
        ),
        site.slug
      );
      // console.log(
      //   "=> dayReportFromPool BEFORE",
      //   JSON.stringify(dayMiningReportFromDayStatements, null, 2)
      // );

      if (
        missingProviders.includes(FinancialPartnaire.ELECTRICITY.toString())
      ) {
        // the electricity cost is missing : clompensate with the pool report
        console.log(" - ", site.slug, day.toISOString(), "update electricity");
        dayMiningReportFromDayStatements.expenses.electricity =
          dayReportFromPool.expenses.electricity;
      }

      if (missingProviders.includes(FinancialPartnaire.CSM.toString())) {
        // the csm cost is missing : clompensate with the pool report
        console.log(" - ", site.slug, day.toISOString(), "update csm");
        dayMiningReportFromDayStatements.expenses.csm =
          dayReportFromPool.expenses.csm;
      }

      if (missingProviders.includes(FinancialPartnaire.OPERATOR.toString())) {
        // the operator cost is missing : clompensate with the pool report
        console.log(" - ", site.slug, day.toISOString(), "update operator");
        dayMiningReportFromDayStatements.expenses.operator =
          dayReportFromPool.expenses.operator;
      }

      if (missingProviders.includes(FinancialPartnaire.POOL.toString())) {
        // the pool income is missing : clompensate with the pool report
        console.log(" - ", site.slug, day.toISOString(), "update pool");
        dayMiningReportFromDayStatements.income.pool =
          dayReportFromPool.income.pool;
      }
    }
    // console.log(
    //   "=> dayReportFromPool AFTER",
    //   JSON.stringify(dayMiningReportFromDayStatements, null, 2)
    // );
    return dayMiningReportFromDayStatements;
  } else if (dayMiningHistory !== undefined) {
    // day has no financial statements : use the mining report from the pool
    const dayReportFromPool = mapDailyMiningReportToSiteMiningReport(
      getSiteDayMiningReportFromPool(site, dayMiningHistory, btcPrice, day),
      site.slug
    );

    return dayReportFromPool;
  } else {
    // no data for the day
    return getEmptyDailyMiningReport(day, equipements, btcPrice);
  }
}
