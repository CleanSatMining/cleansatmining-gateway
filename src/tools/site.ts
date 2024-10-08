import { Site } from "@/types/supabase.extend";
import { BigNumber } from "bignumber.js";
import { calculateDailyGrossIncome } from "@/tools/simulator";
import { Database } from "@/types/supabase";
import { SimulationResult } from "@/types/Simulator";
import { PowerCapacityHistory } from "@/types/Container";
import {
  calculateContainersPower,
  calculateContainersPowerHistory,
} from "./container";
import { getTodayDate } from "./date";
import { DailyMiningReport } from "@/types/MiningReport";
import { DetailedBalanceSheet } from "@/types/BalanceSeet";
import { getDailyMiningReportsPeriod } from "./miningreport";
import { calculateBalanceSheet } from "./balancesheet";

export function calculateSitePower(
  site: Site,
  day: Date
): { watts: number; hashrateTHs: number; units: number } {
  const containers = site.containers;

  return calculateContainersPower(containers, day);
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

export function calculateSitePowerHistory(
  site: Site,
  startDate?: Date,
  endDate?: Date
): PowerCapacityHistory[] {
  const containers = site.containers.filter((container) => {
    // Check if the container is active
    if (container.start === null || container.start === undefined) {
      console.warn(
        "WARN The container " + container.slug + " has no start date",
        container.start
      );
      return false;
    }
    return true;
  });

  console.log(
    "calculateSitePowerHistory",
    site.containers,
    containers.length,
    startDate,
    endDate
  );

  if (containers.length === 0) {
    return [];
  }

  const sortedContainers = containers.sort((a, b) => {
    const dateA = a.start ? new Date(a.start) : new Date();
    const dateB = b.start ? new Date(b.start) : new Date();
    return dateA.getTime() - dateB.getTime();
  });

  const end: Date = endDate ?? getTodayDate();
  const start: Date =
    startDate ??
    (sortedContainers[0].start
      ? new Date(sortedContainers[0].start)
      : getTodayDate());

  return calculateContainersPowerHistory(containers, start, end, []);
}

export function calculateSiteBalanceSheet(
  site: Site,
  miningReports: DailyMiningReport[],
  btcPrice: number
): DetailedBalanceSheet {
  if (miningReports.length === 0) {
    throw new Error("No mining reports found");
  }

  const { start: startDay, end: endDay } =
    getDailyMiningReportsPeriod(miningReports);

  if (!startDay || !endDay) {
    throw new Error(
      "Cannot calculate balance sheet without start and end date"
    );
  }

  const powerHistory = calculateSitePowerHistory(site, startDay, endDay);
  const sheet = calculateBalanceSheet(
    miningReports,
    btcPrice,
    startDay,
    endDay
  );

  console.log(
    "calculateSiteBalanceSheet powerHistory",
    JSON.stringify(powerHistory, null, 2)
  );

  const details = powerHistory.map((power) => {
    const balance = calculateBalanceSheet(
      miningReports.filter(
        (report) =>
          new Date(power.start).getTime() <= new Date(report.day).getTime() &&
          new Date(report.day).getTime() <= new Date(power.end).getTime()
      ),
      btcPrice
    );
    balance.containerIds = site.containers.map((container) => container.id);
    return balance;
  });

  // get container ids
  const containerIds = site.containers.map((container) => container.id);

  return {
    start: sheet.start,
    end: sheet.end,
    days: sheet.days,
    balance: sheet.balance,
    containerIds: containerIds,
    details,
  };
}

export function formatSiteDates(site: Site): Site {
  site.containers.forEach((container) => {
    if (container.start) {
      container.start = new Date(container.start).toISOString();
    }
    if (container.end) {
      container.end = new Date(container.end).toISOString();
    }
  });
  return site;
}
