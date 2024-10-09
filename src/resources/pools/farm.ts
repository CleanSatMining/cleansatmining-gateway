import { convertDateToKey } from "@/tools/date";
import { DayPoolData } from "@/types/Pool";
import BigNumber from "bignumber.js";
import { fetchFarm } from "../farm";
import { fetchPoolData } from "./pools.common";

export interface PoolDataResponse {
  ok: boolean;
  partial: boolean;
  status: number;
  statusText: string;
  data?: DayPoolData[];
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
    const key = convertDateToKey(new Date(data.date));
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
