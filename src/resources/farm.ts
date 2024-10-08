import { GET_GATEWAY_FARM } from "@/constants/apis";
import { DailyMiningReport } from "@/types/MiningReport";
import { fetchFarmOperationalData } from "./operationaldata";
import { getFarmDailyMiningReports } from "@/tools/farm/miningreport";
import { Farm } from "@/types/supabase.extend";
import { fetchMiningReport } from "./miningreport";
import { fetchPoolData } from "./pools";
import { DayPoolData } from "@/types/Pool";
import { convertDateToMapKey } from "@/tools/date";
import BigNumber from "bignumber.js";

export interface FarmApiResponse {
  ok: boolean;
  status: number;
  statusText: string;
  farmData?: Farm;
}

export async function fetchFarm(farm: string): Promise<FarmApiResponse> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_FARM.url === "function"
      ? GET_GATEWAY_FARM.url(farm, "")
      : GET_GATEWAY_FARM.url;

  const apiurl = gatewayBaseUrl + path;

  console.log(apiurl.toString());

  try {
    const response = await fetch(apiurl.toString(), {
      method: "GET",
      headers: GET_GATEWAY_FARM.headers,
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
      farmData: data,
    };
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

export async function fetchFarmPoolData(
  _farm: string,
  first?: number,
  start?: string,
  end?: string
): Promise<PoolDataResponse> {
  // fetch site
  const siteResponse = await fetchFarm(_farm);
  if (!siteResponse.ok || siteResponse.farmData === undefined) {
    return {
      ok: false,
      status: siteResponse.status,
      statusText: siteResponse.statusText,
      partial: false,
      data: [],
    };
  }
  const farm = siteResponse.farmData;

  const poolData: DayPoolData[] = [];
  const error: {
    site: string;
    error: string;
  }[] = [];

  //fatch pool data
  for (const site of farm.sites) {
    const response = await fetchPoolData(site, first);
    //console.log("Pool data", response.poolData?.length);
    if (response.ok && response.poolData) {
      poolData.push(...response.poolData);
    } else {
      error.push({
        site: site.slug,
        error: response.statusText,
      });
    }
  }

  //console.log("Pool data", poolData.length);

  // merge data by day
  const dataPerDay: Map<string, DayPoolData[]> = new Map();
  for (const data of poolData) {
    const key = convertDateToMapKey(new Date(data.date));
    if (!dataPerDay.has(key)) {
      dataPerDay.set(key, []);
    }
    dataPerDay.get(key)?.push(data);
  }

  // loop over keys and sum data
  const result: DayPoolData[] = [];
  for (const [key, value] of dataPerDay) {
    const hashrateTHsSum = value
      .reduce((acc, data) => acc.plus(data.hashrateTHs), new BigNumber(0))
      .toNumber();
    const revenueSum = value
      .reduce((acc, data) => acc.plus(data.revenue), new BigNumber(0))
      .toNumber();

    const sum: DayPoolData = {
      date: key,
      hashrateTHs: hashrateTHsSum,
      efficiency: 0,
      revenue: revenueSum,
      uptimePercentage: 0,
      uptimeTotalMinutes: 0,
      site: farm.slug,
      uptimeTotalMachines: 0,
    };

    for (const data of value) {
      const dataWeight = new BigNumber(data.hashrateTHs).dividedBy(
        hashrateTHsSum
      );
      sum.efficiency = new BigNumber(sum.efficiency)
        .plus(dataWeight.times(data.efficiency))
        .toNumber();
      sum.uptimePercentage = new BigNumber(sum.uptimePercentage)
        .plus(dataWeight.times(data.uptimePercentage))
        .toNumber();
      sum.uptimeTotalMinutes = new BigNumber(sum.uptimeTotalMinutes)
        .plus(dataWeight.times(data.uptimeTotalMinutes))
        .toNumber();
      sum.uptimeTotalMachines = new BigNumber(sum.uptimeTotalMachines)
        .plus(dataWeight.times(data.uptimeTotalMachines))
        .toNumber();
    }
    result.push(sum);
  }

  return {
    ok: true,
    partial: error ? true : false,
    statusText:
      error.length > 0 ? "Some data are missing" + error.toString() : "Success",
    status: 200,
    data: result,
  };
}

export interface PoolDataResponse {
  ok: boolean;
  partial: boolean;
  status: number;
  statusText: string;
  data?: DayPoolData[];
}
