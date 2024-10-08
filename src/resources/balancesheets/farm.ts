import { Farm } from "@/types/supabase.extend";
import { FarmApiResponse, fetchFarm } from "../farm";
import { fetchMiningReport } from "../miningreports/miningreport.common";

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
