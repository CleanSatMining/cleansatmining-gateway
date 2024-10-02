import { GET_GATEWAY_FARM } from "@/constants/apis";
import { DailyMiningReport } from "@/types/MiningReport";
import { fetchFarmOperationalData } from "./operationaldata";
import { getFarmDailyMiningReports } from "@/tools/farm";

export async function fetchFarm(farm: string): Promise<any> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_FARM.url === "function"
      ? GET_GATEWAY_FARM.url(farm, "")
      : GET_GATEWAY_FARM.url;

  const apiurl = gatewayBaseUrl + path;

  console.log(apiurl.toString());

  try {
    return await fetch(apiurl.toString(), {
      method: "GET",
      headers: GET_GATEWAY_FARM.headers,
    });
  } catch (error) {
    console.error("Error api financial statements " + error);
    throw new Error("Error api financial statements " + error);
  }
}

export async function fetchFarmDailyReport(
  farm: string,
  btc: number,
  start_param: string | undefined,
  end_param: string | undefined
): Promise<{
  report: DailyMiningReport[];
  message: string;
  status: number;
  ok: boolean;
}> {
  const operationalData = await fetchFarmOperationalData(
    farm,
    start_param,
    end_param
  );

  if (!operationalData.ok || operationalData.farmData === undefined) {
    return {
      report: [],
      status: operationalData.status,
      ok: false,
      message: operationalData.message,
    };
  }

  const reports = getFarmDailyMiningReports(
    operationalData.financialStatementsData,
    operationalData.miningHistoryData,
    operationalData.farmData,
    btc,
    start_param ? new Date(start_param) : undefined,
    end_param ? new Date(end_param) : undefined
  );
  return {
    report: reports,
    status: 200,
    ok: true,
    message: "Success",
  };
}
