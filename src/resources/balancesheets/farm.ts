import { Farm } from "@/types/supabase.extend";
import { FarmApiResponse, fetchFarm } from "../farm";
import { fetchMiningReport } from "../miningreports/miningreport.common";
import { calculateBalanceSheet } from "@/tools/balancesheets/balancesheet.common";
import { getDailyMiningReportsPeriod } from "@/tools/miningreports/miningreport";
import { calculateFarmPowerHistory } from "@/tools/powerhistory/farm";
import { DetailedBalanceSheet, BalanceSheet } from "@/types/BalanceSeet";
import { DailyMiningReport } from "@/types/MiningReport";

export async function fetchFarmBalanceSheet(
  farm: string,
  btc: number,
  start_param: string | undefined,
  end_param: string | undefined
): Promise<{
  report: any;
  message: string;
  status: number;
  ok: boolean;
}> {
  const farmApiResponse: FarmApiResponse = await fetchFarm(farm);

  if (!farmApiResponse.ok || farmApiResponse.farmData === undefined) {
    return {
      report: {},
      status: farmApiResponse.status,
      ok: false,
      message:
        "Error while fetching farm " + farm + "! " + farmApiResponse.statusText,
    };
  }
  const farmData: Farm = farmApiResponse.farmData;

  const miningReportData = await fetchMiningReport(
    farm,
    undefined,
    btc,
    start_param,
    end_param
  );

  if (!miningReportData.ok || miningReportData.report === undefined) {
    return {
      report: [],
      status: miningReportData.status,
      ok: false,
      message: miningReportData.message,
    };
  }

  const reports = miningReportData.report;
  return {
    report: reports,
    status: 200,
    ok: true,
    message: "Success",
  };
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
