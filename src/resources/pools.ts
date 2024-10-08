import { Site } from "@/types/supabase.extend";
import { antpoolHistory } from "./pools/antpool";
import { foundryHistory } from "./pools/foundry";
import { luxorHistory } from "./pools/luxor";
import { APIMiningPoolResponse, DayPoolData } from "@/types/Pool";
import { error } from "console";
import { calculateDaysBetweenDates, getTodayDate } from "@/tools/date";

export interface PoolDataResponse {
  ok: boolean;
  status: number;
  statusText: string;
  poolData?: DayPoolData[];
}

export async function fetchPoolData(
  site: Site,
  _first?: number
): Promise<PoolDataResponse> {
  const first = _first ?? 500;
  const poolId = site.contract.api.poolId;
  const siteEndDate = site.closed_at ? new Date(site.closed_at) : undefined;

  let data: APIMiningPoolResponse;

  switch (poolId) {
    case 1:
      data = await antpoolHistory(first, site);
      break;
    case 2:
      data = await luxorHistory(first, site);
      break;
    case 3:
      data = await foundryHistory(first, site);
      break;
    default:
      throw new Error("Pool not supported");
  }

  console.log("Pool data", data.days.length);

  if (data.error !== undefined) {
    return {
      ok: false,
      status: 500,
      statusText: "Error " + error,
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
  };
}
