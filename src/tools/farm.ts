import { PowerCapacityHistory } from "@/types/Container";
import { Site, Farm } from "@/types/supabase.extend";
import {
  calculateContainersPower,
  calculateContainersPowerHistory,
} from "./container";
import { getTodayDate } from "./date";
import { DailyMiningReport } from "@/types/MiningReport";
import { BalanceSheet, DetailedBalanceSheet } from "@/types/BalanceSeet";
import { calculateBalanceSheet } from "./balancesheet";
import { getDailyMiningReportsPeriod } from "./miningreport";
import { formatSiteDates } from "./site";

export function calculateFarmPower(
  farm: Farm,
  day: Date
): {
  watts: number;
  hashrateTHs: number;
  units: number;
} {
  const containers = farm.sites.reduce((acc, site) => {
    return acc.concat(site.containers);
  }, [] as Site["containers"]);

  const activeContainers = containers.filter((container) => {
    // Check if the container is active
    if (container.start === null || container.start === undefined) {
      console.warn("Container is not active", container.id, container.start);
      return false;
    }
    return true;
  });

  if (activeContainers.length === 0) {
    return { watts: 0, hashrateTHs: 0, units: 0 };
  }

  return calculateContainersPower(activeContainers, day);
}

export function calculateFarmPowerHistory(
  farm: Farm,
  startDate?: Date,
  endDate?: Date
): PowerCapacityHistory[] {
  const containers = farm.sites.reduce((acc, site) => {
    return acc.concat(site.containers);
  }, [] as Site["containers"]);

  const activeContainers = containers.filter((container) => {
    // Check if the container is active
    if (container.start === null || container.start === undefined) {
      console.warn("Container is not active", container.id, container.start);
      return false;
    }
    return true;
  });

  if (activeContainers.length === 0) {
    return [];
  }

  const sortedContainers = activeContainers.sort((a, b) => {
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

  console.log("start calculateContainersPowerHistory", start, end);

  return calculateContainersPowerHistory(sortedContainers, start, end, []);
  //return [];
}

export function calculateFarmBalanceSheet(
  farm: Farm,
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

  const powerHistory = calculateFarmPowerHistory(farm, startDay, endDay);
  const sheet: BalanceSheet = calculateBalanceSheet(
    miningReports,
    btcPrice,
    startDay,
    endDay
  );

  const details: BalanceSheet[] = powerHistory.map((power) => {
    const balanceSheet = calculateBalanceSheet(
      miningReports.filter(
        (report) =>
          new Date(power.start).getTime() <= new Date(report.day).getTime() &&
          new Date(report.day).getTime() < new Date(power.end).getTime()
      ),
      btcPrice
    );
    balanceSheet.containerIds = power.containers.map(
      (container) => container.containerId
    );
    return balanceSheet;
  });

  // get all container ids
  const containerIds = farm.sites.reduce((acc, site) => {
    return acc.concat(site.containers.map((container) => container.id));
  }, [] as number[]);

  return {
    start: sheet.start,
    end: sheet.end,
    days: sheet.days,
    balance: sheet.balance,
    containerIds: containerIds,
    details,
  };
}

export function formatFarmDates(farm: Farm): Farm {
  farm.sites = farm.sites.map((site) => {
    return formatSiteDates(site);
  });
  return farm;
}
