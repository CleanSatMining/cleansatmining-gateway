import { GET_GATEWAY_SITE } from "@/constants/apis";
import { DailyMiningReport } from "@/types/MiningReport";
import { fetchSiteOperationalData } from "./operationaldata";
import { getSiteDailyMiningReports } from "@/tools/site/miningreport";

export async function fetchSite(farm: string, site: string): Promise<any> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_SITE.url === "function"
      ? GET_GATEWAY_SITE.url(farm, site)
      : GET_GATEWAY_SITE.url;

  const apiurl = gatewayBaseUrl + path;

  console.log(apiurl.toString());

  try {
    return await fetch(apiurl.toString(), {
      method: GET_GATEWAY_SITE.method,
      headers: GET_GATEWAY_SITE.headers,
    });
  } catch (error) {
    console.error("Error api financial statements " + error);
    throw new Error("Error api financial statements " + error);
  }
}

export async function fetchSiteDailyReport(
  farm: string,
  site: string,
  btc: number,
  start_param: string | undefined,
  end_param: string | undefined
): Promise<{
  report: DailyMiningReport[];
  message: string;
  status: number;
  ok: boolean;
}> {
  const operationalData = await fetchSiteOperationalData(
    farm,
    site,
    start_param,
    end_param
  );

  if (!operationalData.ok || operationalData.siteData === undefined) {
    return {
      report: [],
      status: operationalData.status,
      ok: false,
      message: operationalData.message,
    };
  }

  const reports = getSiteDailyMiningReports(
    operationalData.financialStatementsData,
    operationalData.miningHistoryData,
    operationalData.siteData,
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
