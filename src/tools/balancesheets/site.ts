import { DetailedBalanceSheet } from "@/types/BalanceSeet";
import { DailyMiningReport } from "@/types/MiningReport";
import { Site } from "@/types/supabase.extend";
import { getDailyMiningReportsPeriod } from "../miningreports/miningreport";
import { calculateSitePowerHistory } from "../powerhistory/site";
import { calculateBalanceSheet } from "./balancesheet.common";

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
