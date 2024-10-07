import { PowerCapacityHistory } from "@/types/Container";
import { Site, Farm } from "@/types/supabase.extend";
import { calculateContainersPowerHistory } from "./container";
import { getTodayDate } from "./date";
import { DailyMiningReport } from "@/types/MiningReport";
import { DetailedBalanceSheet } from "@/types/BalanceSeet";
import { calculateBalanceSheet } from "./balancesheet";
import { getDailyMiningReportsPeriod } from "./miningreport";
import { formatSiteDates } from "./site";

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
  const sheet = calculateBalanceSheet(
    miningReports,
    btcPrice,
    startDay,
    endDay
  );

  console.log("calculateFarmBalanceSheet", powerHistory.length, sheet.days);
  console.log(
    "calculateFarmBalanceSheet",
    JSON.stringify(powerHistory, null, 2)
  );
  console.log(
    "calculateFarmBalanceSheet",
    JSON.stringify(miningReports, null, 2)
  );

  const details = powerHistory.map((power) => {
    return calculateBalanceSheet(
      miningReports.filter(
        (report) =>
          new Date(power.start).getTime() <= new Date(report.day).getTime() &&
          new Date(report.day).getTime() < new Date(power.end).getTime()
      ),
      btcPrice
    );
  });

  return {
    start: sheet.start,
    end: sheet.end,
    days: sheet.days,
    balance: sheet.balance,
    details,
  };
}

export function formatFarmDates(farm: Farm): Farm {
  farm.sites = farm.sites.map((site) => {
    return formatSiteDates(site);
  });
  return farm;
}
