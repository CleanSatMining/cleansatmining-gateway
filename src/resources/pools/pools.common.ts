import { Site } from "@/types/supabase.extend";
import { antpoolHistory } from "./entities/antpool";
import { foundryHistory } from "./entities/foundry";
import { luxorHistory } from "./entities/luxor";
import { luxorLegacyHistory } from "./entities/luxor.legacy";
import { APIMiningPoolResponse, DayPoolData } from "@/types/Pool";

import { Pool } from "@/types/Pool";
import { getNDaysAgo } from "@/tools/date";

export interface PoolDataResponse {
  ok: boolean;
  status: number;
  statusText: string;
  poolData?: DayPoolData[];
  closedAt?: Date;
}

export async function fetchPoolData(
  site: Site,
  _first?: number
): Promise<PoolDataResponse> {
  const first = _first ?? 500;
  const poolId = site.contract.api.poolId as Pool;
  const siteEndDate = site.closed_at ? new Date(site.closed_at) : undefined;

  // calculate the date to start fetching the data
  const dataStartDay = getNDaysAgo(first);

  if (siteEndDate && dataStartDay.getTime() <= siteEndDate.getTime()) {
    console.warn(
      "Pool data start date is after the site closed date, no need to fetch data"
    );
    return {
      ok: true,
      status: 200,
      statusText: "Success",
      poolData: [],
      closedAt: siteEndDate,
    };
  }

  let data: APIMiningPoolResponse;

  switch (poolId) {
    case Pool.Antpool:
      console.log("FETCH POOL DATA", "ANTPOOL", site.slug, "first : " + first);
      data = await antpoolHistory(first, site);
      break;
    case Pool.Foundry:
      console.log("FETCH POOL DATA", "FOUNDRY", site.slug, "first : " + first);
      data = await foundryHistory(first, site);
      break;
    case Pool.Luxor:
      console.log("FETCH POOL DATA", "LUXOR", site.slug, "first : " + first);
      data = await luxorHistory(first, site);
      break;
    case Pool.LuxorLegacy:
      console.log(
        "FETCH POOL DATA",
        "LUXOR LEGACY",
        site.slug,
        "first : " + first
      );
      data = await luxorLegacyHistory(first, site);
      break;
    default:
      throw new Error("Pool not supported");
  }

  if (data.error !== undefined) {
    console.error("FETCH POOL DATA ERROR", data.error);
    return {
      ok: false,
      status: 500,
      statusText: "Error " + data.error,
    };
  }

  // remove all the closed days if the site is closed
  if (siteEndDate) {
    data.days = data.days.filter((day) => {
      const dayDate = new Date(day.date);
      const closedDate = new Date(siteEndDate);
      return dayDate.getTime() < closedDate.getTime();
    });
  }

  return {
    ok: true,
    status: 200,
    statusText: "Success",
    poolData: data.days,
    closedAt: siteEndDate,
  };
}
