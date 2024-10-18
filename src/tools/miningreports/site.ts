import {
  DailyFinancialStatement,
  DailyPartnaireFinancialStatement,
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
  calculateDaysBetweenDates,
  convertDateToKey,
  getTodayDate,
} from "../date";
import { getFinancialStatementsPeriod } from "../financialstatements/financialstatement.commons";
import { aggregateSiteFinancialStatementsByDay } from "../financialstatements/site";
import {
  calculateMinedBtc,
  getMiningHistoryPeriod,
} from "../mininghistory/mininghistory.common";
import {
  calculateSiteElectricityCost,
  getSiteMiningHistoryByDay,
} from "../mininghistory/site";
import {
  filterMiningReportsByDay,
  getDailyMiningReportFromPool,
  convertDayFinancialStatementsToMiningReport,
  getEmptyDailyMiningReport,
  getMiningReportByDay,
} from "./miningreport";
import { calculateSiteGrossIncome } from "../site";
import { getSiteEquipments } from "../equipment/site";
import { calculateSiteRevenue } from "../simulator/site";
import { SimulationResult } from "@/types/Simulator";
import BigNumber from "bignumber.js";
import { get } from "http";

export function getSiteDailyMiningReports(
  financialStatements: Database["public"]["Tables"]["financialStatements"]["Row"][],
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  site: Site,
  btcPrice: number,
  startDay: Date | undefined = undefined,
  endDay: Date = getTodayDate(),
  depreciationDuration: number
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
    endDay,
    depreciationDuration
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
  depreciationDuration: number,
  withDetails: boolean = false
): Map<string, DailyMiningReport> {
  const miningReportByDay: Map<string, DailyMiningReport> = new Map();

  if (site.started_at === undefined || site.started_at === null) {
    // site has not started yet
    return miningReportByDay;
  }

  const siteMiningHistory = _miningHistory.filter(
    (history) => history.siteSlug === site.slug
  );
  const financialStatements = _financialStatements.filter(
    (statement) => statement.siteSlug === site.slug
  );

  // get the mining history data by day
  const miningHistoryByDay = getSiteMiningHistoryByDay(siteMiningHistory, site);

  // get the period of the financial statements and the mining history
  const { start: starthistory, end: endhistory } =
    getMiningHistoryPeriod(siteMiningHistory);
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

  // get mining reports from the mining history
  const miningReportsFromMiningHistory =
    convertSiteMiningHistoryToMiningReports(
      site,
      siteMiningHistory,
      btcPrice,
      depreciationDuration
    );

  const miningReportsFromMiningHistoryByDay = getMiningReportByDay(
    miningReportsFromMiningHistory
  );

  // aggregate the daily financial statement for each day of the financial statements
  const financialStatementsByDay = aggregateSiteFinancialStatementsByDay(
    site,
    financialStatements,
    siteMiningHistory
  );

  // get the daily financial statement for each day of the financial statements
  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const day = new Date(extendedStart);
    day.setUTCDate(day.getUTCDate() + dayIndex);
    const dayKey = convertDateToKey(day);
    const dayMiningReport =
      miningReportsFromMiningHistoryByDay.get(dayKey) ??
      getEmptyDailyMiningReport(day, getSiteEquipments(site, day), btcPrice);

    // get the financial statements if exists
    const dayStatement = financialStatementsByDay.get(dayKey);

    // get the mining report if exists
    const aggregatedReport = aggregateSiteMiningData(
      site,
      day,
      btcPrice,
      dayMiningReport,
      dayStatement
    );

    if (withDetails) {
      aggregatedReport.site = site.slug;
    } else {
      aggregatedReport.site = undefined;
    }

    miningReportByDay.set(dayKey, aggregatedReport);
  }

  // filter the daily accounting by date
  filterMiningReportsByDay(
    miningReportByDay,
    start_param ?? extendedStart,
    end_param ?? extentedEnd
  );

  return miningReportByDay;
}

function aggregateSiteMiningData(
  site: Site,
  day: Date,
  btcPrice: number,
  _dayMiningReport: DailyMiningReport | undefined,
  dayFinancialStatement: DailyFinancialStatement | undefined
): DailyMiningReport {
  const dayMiningReport =
    _dayMiningReport ??
    getEmptyDailyMiningReport(day, getSiteEquipments(site, day), btcPrice);

  // check the date are the same day
  if (dayMiningReport.day.getTime() !== day.getTime()) {
    console.error(
      "=> WARN dayMiningReport day is not the same as the day",
      dayMiningReport.day.toISOString(),
      day.toISOString()
    );
    throw new Error("dayMiningReport day is not the same as the day");
  }
  if (
    dayFinancialStatement !== undefined &&
    dayFinancialStatement.day.getTime() !== day.getTime()
  ) {
    console.error(
      "=> WARN dayFinancialStatement day is not the same as the day",
      dayFinancialStatement.day.toISOString(),
      day.toISOString()
    );
    throw new Error("dayFinancialStatement day is not the same as the day");
  }

  // update the mining report with the financial statements
  if (dayFinancialStatement !== undefined) {
    if (
      dayFinancialStatement.flows["csm sa"].amount.source ===
      FinancialSource.STATEMENT
    ) {
      dayMiningReport.expenses.csm =
        dayFinancialStatement.flows["csm sa"].amount;
    }
    if (
      dayFinancialStatement.flows["electricity"].amount.source ===
      FinancialSource.STATEMENT
    ) {
      dayMiningReport.expenses.electricity =
        dayFinancialStatement.flows["electricity"].amount;
    }
    if (
      dayFinancialStatement.flows["operator"].amount.source ===
      FinancialSource.STATEMENT
    ) {
      dayMiningReport.expenses.operator =
        dayFinancialStatement.flows["operator"].amount;
    }
    if (
      dayFinancialStatement.flows["pool"].amount.source ===
      FinancialSource.STATEMENT
    ) {
      dayMiningReport.incomes.mining =
        dayFinancialStatement.flows["pool"].amount;
    }
    if (
      dayFinancialStatement.flows["other"].amount.source ===
      FinancialSource.STATEMENT
    ) {
      if (dayFinancialStatement.flows["other"].flow === "in") {
        dayMiningReport.incomes.other =
          dayFinancialStatement.flows["other"].amount;
      } else {
        dayMiningReport.expenses.other =
          dayFinancialStatement.flows["other"].amount;
      }
    }
  }

  return dayMiningReport;
}

/**
 *
 * @param site
 * @param miningHistory
 * @param btcPrice
 * @param depreciationDuration
 * @returns
 */
export function convertSiteMiningHistoryToMiningReports(
  site: Site,
  miningHistory: Database["public"]["Tables"]["mining"]["Row"][],
  btcPrice: number,
  depreciationDuration: number
): DailyMiningReport[] {
  if (site.started_at === undefined || site.started_at === null) {
    return [];
  }

  const siteMiningHistory = miningHistory.filter(
    (history) => history.siteSlug === site.slug
  );

  // get the period of the financial statements and the mining history
  const { start: starthistory, end: endhistory } =
    getMiningHistoryPeriod(siteMiningHistory);

  if (starthistory === undefined || endhistory === undefined) {
    return [];
  }

  const totalSimulationElectricityCost = calculateSiteElectricityCost(
    siteMiningHistory,
    site
  );
  const totalSimulationBtcMined = calculateMinedBtc(siteMiningHistory);
  const totalRevenue = calculateSiteRevenue(
    site,
    starthistory,
    endhistory,
    totalSimulationBtcMined,
    totalSimulationElectricityCost,
    btcPrice,
    depreciationDuration
  );

  const totalhashrateTHs = siteMiningHistory.reduce((acc, history) => {
    return new BigNumber(acc).plus(history.hashrateTHs).toNumber();
  }, 0);
  const reports: DailyMiningReport[] = siteMiningHistory.map((history) => {
    const weight = new BigNumber(history.hashrateTHs).div(totalhashrateTHs);

    const electricityCostBtc = new BigNumber(
      totalRevenue.cost.electricity.total.btc
    ).times(weight);
    const csmCostBtc = new BigNumber(totalRevenue.cost.csm.btc).times(weight);
    const operatorCostBtc = new BigNumber(totalRevenue.cost.operator.btc).times(
      weight
    );
    const otherCostBtc = new BigNumber(totalRevenue.cost.other.btc).times(
      weight
    );
    const depreciation = new BigNumber(
      totalRevenue.cost.depreciation.equipment.btc
    ).times(weight);

    const otherIncomeBtc = new BigNumber(totalRevenue.income.other.btc).times(
      weight
    );

    const report: DailyMiningReport = {
      site: site.slug,
      btcSellPrice: totalRevenue.btcSellPrice,
      day: new Date(history.day),
      uptime: history.uptime,
      hashrateTHs: history.hashrateTHs,
      equipements: getSiteEquipments(site, new Date(history.day)),
      expenses: {
        electricity: {
          btc: electricityCostBtc.toNumber(),
          usd: electricityCostBtc.times(btcPrice).toNumber(),
          source: FinancialSource.SIMULATOR,
        },
        csm: {
          btc: csmCostBtc.toNumber(),
          usd: csmCostBtc.times(btcPrice).toNumber(),
          source: FinancialSource.SIMULATOR,
        },
        operator: {
          btc: operatorCostBtc.toNumber(),
          usd: operatorCostBtc.times(btcPrice).toNumber(),
          source: FinancialSource.SIMULATOR,
        },
        other: {
          btc: otherCostBtc.toNumber(),
          usd: otherCostBtc.times(btcPrice).toNumber(),
          source: FinancialSource.SIMULATOR,
        },
        depreciation: {
          btc: depreciation.toNumber(),
          usd: depreciation.times(btcPrice).toNumber(),
          source: FinancialSource.SIMULATOR,
        },
      },
      incomes: {
        mining: {
          btc: new BigNumber(history.mined).toNumber(),
          usd: new BigNumber(history.mined).times(btcPrice).toNumber(),
          source: FinancialSource.SIMULATOR,
        },
        other: {
          btc: otherIncomeBtc.toNumber(),
          usd: otherIncomeBtc.times(btcPrice).toNumber(),
          source: FinancialSource.NONE,
        },
      },
      revenue: {
        gross: {
          btc: new BigNumber(totalRevenue.revenue.gross.btc)
            .times(weight)
            .toNumber(),
          usd: new BigNumber(totalRevenue.revenue.gross.btc)
            .times(weight)
            .times(btcPrice)
            .toNumber(),
          source: FinancialSource.SIMULATOR,
        },
        net: {
          btc: new BigNumber(totalRevenue.revenue.net.btc)
            .times(weight)
            .toNumber(),
          usd: new BigNumber(totalRevenue.revenue.net.btc)
            .times(weight)
            .times(btcPrice)
            .toNumber(),
          source: FinancialSource.SIMULATOR,
        },
      },
    };
    return report;
  });

  return reports;
}
