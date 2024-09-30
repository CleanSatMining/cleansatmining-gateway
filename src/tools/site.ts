import { Site } from "@/types/supabase.extend";
import { BigNumber } from "bignumber.js";
import { calculateDailyGrossIncome } from "@/tools/simulator";
import { Database } from "@/types/supabase";
import { SimulationResult } from "@/types/Simulator";
import { DailyMiningReport } from "@/types/MiningReport";
import { getMiningHistoryByDay, getMiningHistoryPeriod } from "./mininghistory";
import {
  aggregateFinancialStatementsByDay as aggregateFinancialStatementsByDay,
  getFinancialStatementsPeriod,
} from "./financialstatements";
import {
  convertToUTCStartOfDay,
  calculateDaysBetweenDates,
  convertDateToMapKey,
} from "./date";
import {
  filterMiningReportsByDay,
  getDailyMiningReportFromPool,
  getEmptyDailyMiningReport,
  mergeDayStatementsIntoMiningReport,
} from "./miningreport";
import {
  DailyFinancialStatement,
  FinancialSource,
} from "@/types/FinancialSatement";

export function calculateSitePower(
  site: Site,
  day: Date
): { watts: number; hashrateTHs: number } {
  const containers = site.containers.filter((container) => {
    // Check if the container is active
    if (container.start === null || container.start === undefined) {
      return false;
    }

    const yearStart = new Date(container.start).getUTCFullYear();
    const monthStart = new Date(container.start).getUTCMonth();
    const dayStart = new Date(container.start).getUTCDate();

    //check if the container is active on the day
    const isStarted =
      yearStart <= day.getUTCFullYear() &&
      monthStart <= day.getUTCMonth() &&
      dayStart <= day.getUTCDate();

    let isEnded = false;

    // check if the container is still active
    if (container.end !== null && container.end !== undefined) {
      const yearEnd = new Date(container.end).getUTCFullYear();
      const monthEnd = new Date(container.end).getUTCMonth();
      const dayEnd = new Date(container.end).getUTCDate();

      isEnded =
        yearEnd >= day.getUTCFullYear() &&
        monthEnd >= day.getUTCMonth() &&
        dayEnd >= day.getUTCDate();
    }

    return isStarted && !isEnded;
  });

  // Calculate the electricity power of the site
  const watts = containers
    .reduce((acc, container) => {
      return acc.plus(
        new BigNumber(container.units).times(container.asics.powerW)
      );
    }, new BigNumber(0))
    .toNumber();

  // Calculate the hashrate of the site
  const hashrateTHs = containers
    .reduce((acc, container) => {
      return acc.plus(
        new BigNumber(container.units).times(container.asics.hashrateTHs)
      );
    }, new BigNumber(0))
    .toNumber();

  return { watts, hashrateTHs };
}

export function calculateSiteGrossIncome(
  site: Site,
  miningDay: Database["public"]["Tables"]["mining"]["Row"],
  btcPrice: number,
  dailyElectricityBtcCost?: number
): SimulationResult {
  // check the farm et the site
  const { farmSlug, siteSlug } = miningDay;
  if (farmSlug !== site.farmSlug || siteSlug !== site.slug) {
    throw new Error("The mining day is not related to the site " + site.slug);
  }

  const { watts } = calculateSitePower(site, new Date(miningDay.day));
  return calculateDailyGrossIncome(
    miningDay.mined,
    btcPrice,
    miningDay.uptime,
    watts,
    site.contract.electricityPrice,
    {
      powerTaxUsd: site.contract.csmPowerTax,
      profitShareRate: site.contract.csmProfitSharing,
      taxRate: site.contract.csmTaxRate,
    },
    {
      powerTaxUsd: site.contract.opPowerTax,
      profitShareRate: site.contract.opProfitSharing,
      taxRate: site.contract.opTaxRate,
    },
    dailyElectricityBtcCost
  );
}
export function getSiteDailyMiningReports(
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  site: Site,
  btcPrice: number,
  startDay: Date | undefined = undefined,
  endDay: Date = new Date()
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
  startDay: Date | undefined = undefined,
  endDay: Date = new Date()
): Map<string, DailyMiningReport> {
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
    return getEmptyDailyMiningReport(day);
  }
}
