import { GET_GATEWAY_SITE } from "@/constants/apis";
import { DailyMiningReport } from "@/types/MiningReport";
import { fetchSiteOperationalData } from "./operationaldata";
import { getSiteDailyMiningReports } from "@/tools/site/miningreport";
import { fetchPoolData, PoolDataResponse } from "./pools";
import { Site } from "@/types/supabase.extend";

export interface SiteApiResponse {
  ok: boolean;
  status: number;
  statusText: string;
  siteData?: Site;
}

export async function fetchSite(
  farm: string,
  site: string
): Promise<SiteApiResponse> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_SITE.url === "function"
      ? GET_GATEWAY_SITE.url(farm, site)
      : GET_GATEWAY_SITE.url;

  const apiurl = gatewayBaseUrl + path;

  console.log(apiurl.toString());

  try {
    const response = await fetch(apiurl.toString(), {
      method: GET_GATEWAY_SITE.method,
      headers: GET_GATEWAY_SITE.headers,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
      };
    }
    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      siteData: data,
    };
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

export async function fetchSitePoolData(
  _farm: string,
  _site: string,
  first?: number,
  start?: string,
  end?: string
): Promise<PoolDataResponse> {
  // fetch site
  const siteResponse = await fetchSite(_farm, _site);

  if (!siteResponse.ok || siteResponse.siteData === undefined) {
    return {
      ok: false,
      status: siteResponse.status,
      statusText: siteResponse.statusText,
    };
  }
  const site = siteResponse.siteData;

  //fatch pool data
  return await fetchPoolData(site, first);
}
