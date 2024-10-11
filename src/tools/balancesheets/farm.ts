import { DetailedBalanceSheet, BalanceSheet } from "@/types/BalanceSeet";
import { DailyMiningReport } from "@/types/MiningReport";
import { Farm } from "@/types/supabase.extend";
import { getDailyMiningReportsPeriod } from "../miningreports/miningreport";
import { calculateFarmPowerHistory } from "../powerhistory/farm";
import { calculateBalanceSheet } from "./balancesheet.common";

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
  console.log("=> powerHistory", JSON.stringify(powerHistory, null, 2));

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
  const containerIds = details.reduce((acc, detail) => {
    return detail.containerIds ? acc.concat(detail.containerIds) : acc;
  }, [] as number[]);
  return {
    start: sheet.start,
    end: sheet.end,
    days: sheet.days,
    balance: sheet.balance,
    containerIds: Array.from(new Set(containerIds)),
    details,
  };
}
