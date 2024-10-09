/* eslint-disable import/no-anonymous-default-export */
import type { Context } from "@netlify/functions";
import { Database } from "../../src/types/supabase";
import {
  getSupabaseClient,
  signIn,
  signOut,
} from "../../src/databases/supabase";
import { fetchMiningHistory } from "../../src/resources/operationalData/mininghistory";

import { MiningData } from "../../src/types/MiningHistory";
import {
  getYesterdayDate,
  convertToUTCStartOfDay,
  calculateDaysBetweenDates,
  getTodayDate,
} from "../../src/tools/date";
import { DayPoolData } from "../../src/types/Pool";
import { fetchSitePoolData } from "../../src/resources/pools/site";
import { fetchPoolData } from "../../src/resources/pools/pools.common";

import { SupabaseClient } from "@supabase/supabase-js";
import { Site } from "../../src/types/supabase.extend";
import { fetchFarm } from "../../src/resources/farm";

interface UpdateResponse {
  farm: string;
  site: string;
  lastUpdate?: Date;
  daysBeforeUpdate: number;
  updatedData: DayPoolData[];
  closeAt?: Date;
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const farm = url.searchParams.get("farm") || undefined;
  const site = url.searchParams.get("site") || undefined;
  const username = process.env.SUPABASE_ADMIN_USER ?? "";
  const password = process.env.SUPABASE_ADMIN_PASSWORD ?? "";

  const supabase = getSupabaseClient();
  await signIn(supabase, username, password);
  let response;
  if (farm !== undefined && site !== undefined) {
    response = await updateMiningHistory(supabase, farm, site);
  } else if (farm !== undefined) {
    response = await updateFarmMiningHistory(supabase, farm);
  } else {
    response = await updateAllMiningHistory(supabase);
  }
  await signOut(supabase);

  if (!response.ok) {
    return new Response(response.statusText, { status: response.status });
  }

  const data = response.data;

  return new Response(
    JSON.stringify({
      data,
    }),
    {
      headers: { "content-type": "application/json" },
    }
  );
};

export async function updateMiningHistory(
  supabase: SupabaseClient,
  farm: string,
  site: string
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  data?: {
    site: string;
    lastUpdate?: Date;
    daysBeforeUpdate: number;
    updatedData: DayPoolData[];
    closeAt?: Date;
  };
}> {
  console.log("UPDATING mining history", farm, site);
  // get the last mining data recorded
  const {
    data: miningData,
    ok,
    status,
    statusText,
  } = await fetchMiningHistory(farm, site, undefined, undefined, 1);

  if (!ok) {
    return {
      ok: false,
      status,
      statusText,
    };
  }

  let daysPoolData;
  // search for the number of days to update
  const { daysBeforeUpdate, lastUpdate } = searchDaysToUpdate(miningData);

  const poolResponse = await fetchSitePoolData(farm, site, daysBeforeUpdate);

  if (!poolResponse.ok || poolResponse.poolData === undefined) {
    return {
      ok: false,
      status: poolResponse.status,
      statusText: poolResponse.statusText,
    };
  }

  // filter the data to update
  daysPoolData = poolResponse.poolData.filter((d) => {
    const dayDate = new Date(d.date);
    return (
      lastUpdate === undefined || // (ie update all the data)
      dayDate.getTime() > lastUpdate.getTime()
    );
  });

  if (daysPoolData.length === 0) {
    return {
      ok: true,
      status: 204,
      statusText: "No data to update",
      data: {
        site,
        lastUpdate,
        daysBeforeUpdate,
        updatedData: [],
        closeAt: poolResponse.closedAt,
      },
    };
  }
  try {
    insertPoolDataInMiningTable(supabase, farm, daysPoolData);
  } catch (error) {
    return {
      ok: false,
      status: 500,
      statusText: "Error " + error,
    };
  }

  return {
    ok: true,
    status: 200,
    statusText: "sucess",
    data: {
      site,
      lastUpdate,
      daysBeforeUpdate,
      updatedData: daysPoolData,
      closeAt: poolResponse.closedAt,
    },
  };
}

export async function updateAllMiningHistory(
  supabase: SupabaseClient
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  partial: boolean;
  data?: UpdateResponse[];
}> {
  // fetch the farm data
  let partialResponse = false;
  let statusText = "success";
  let returnData: UpdateResponse[] = [];

  // get all the farms
  const { data: farmsData, error } = await supabase.from("farms").select("*");
  if (error) {
    return {
      ok: false,
      partial: false,
      status: 500,
      statusText: "Error while fetching farms",
    };
  }

  const farms = farmsData as Database["public"]["Tables"]["farms"]["Row"][];
  for (const farm of farms) {
    const response = await updateFarmMiningHistory(supabase, farm.slug);
    if (!response.ok || response.data === undefined) {
      console.error("UPDATING mining Error farm", farm.slug);
      statusText =
        statusText + "; " + farm.slug + " KO : " + response.statusText;
      partialResponse = true;
    } else {
      console.log("UPDATING mining success farm", farm.slug);
      returnData.push(...response.data);
    }
  }

  return {
    ok: true,
    partial: partialResponse,
    status: 200,
    statusText: statusText,
    data: returnData,
  };
}

export async function updateFarmMiningHistory(
  supabase: SupabaseClient,
  farmName: string
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  partial: boolean;
  data?: UpdateResponse[];
}> {
  // fetch the farm data
  const farmResponse = await fetchFarm(farmName);
  if (!farmResponse.ok || farmResponse.farmData === undefined) {
    return {
      ok: false,
      partial: false,
      status: farmResponse.status,
      statusText: farmResponse.statusText,
    };
  }

  const farm = farmResponse.farmData;

  const returnData: UpdateResponse[] = [];
  let partialResponse = false;
  let statusText = "success";
  for (const site of farm.sites) {
    const updateResponse = await updateSiteMiningHistory(supabase, site);
    if (!updateResponse.ok || updateResponse.data === undefined) {
      console.error("UPDATING mining Error site", site.slug);
      statusText =
        statusText + "; " + site.slug + " KO : " + updateResponse.statusText;
      partialResponse = true;
    } else {
      console.log(
        "UPDATING mining success site",
        site.slug,
        updateResponse.data.site
      );
      returnData.push(updateResponse.data);
    }
  }

  return {
    ok: true,
    partial: partialResponse,
    status: 200,
    statusText: statusText,
    data: returnData,
  };
}

export async function updateSiteMiningHistory(
  supabase: SupabaseClient,
  site: Site
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  data?: UpdateResponse;
}> {
  console.log("UPDATING mining history", site.farmSlug, site.slug);

  const farmSlug = site.farmSlug;
  const siteSlug = site.slug;

  // get the last mining data recorded
  const {
    data: miningData,
    ok,
    status,
    statusText,
  } = await fetchMiningHistory(farmSlug, siteSlug, undefined, undefined, 1);

  if (!ok) {
    // error while fetching mining data
    return {
      ok: false,
      status,
      statusText,
    };
  }

  // get the last pool data recorded
  let daysPoolData;
  // search for the number of days to update
  const { daysBeforeUpdate, lastUpdate } = searchDaysToUpdate(miningData, site);

  if (daysBeforeUpdate === 0) {
    // no data to update
    return returnNoUpdate(
      farmSlug,
      siteSlug,
      lastUpdate,
      daysBeforeUpdate,
      undefined
    );
  }

  const poolResponse = await fetchPoolData(site, daysBeforeUpdate);

  if (!poolResponse.ok || poolResponse.poolData === undefined) {
    return {
      ok: false,
      status: poolResponse.status,
      statusText: poolResponse.statusText,
    };
  }

  // filter the data to update in mining table
  daysPoolData = poolResponse.poolData.filter((d) => {
    const dayDate = new Date(d.date);
    return (
      lastUpdate === undefined || // (ie update all the data)
      dayDate.getTime() > lastUpdate.getTime()
    );
  });

  if (daysPoolData.length === 0) {
    // no data to update
    return returnNoUpdate(
      farmSlug,
      siteSlug,
      lastUpdate,
      daysBeforeUpdate,
      poolResponse.closedAt
    );
  }
  // insert the data in the mining table
  try {
    insertPoolDataInMiningTable(supabase, farmSlug, daysPoolData);
  } catch (error) {
    return {
      ok: false,
      status: 500,
      statusText: "Error " + error,
    };
  }

  return {
    ok: true,
    status: 200,
    statusText: "sucess",
    data: {
      farm: farmSlug,
      site: siteSlug,
      lastUpdate,
      daysBeforeUpdate,
      updatedData: daysPoolData,
      closeAt: poolResponse.closedAt,
    },
  };
}

function returnNoUpdate(
  farmSlug: any,
  siteSlug: any,
  lastUpdate: Date | undefined,
  daysBeforeUpdate: number,
  closedAt: Date | undefined
): { ok: boolean; status: number; statusText: string; data?: UpdateResponse } {
  return {
    ok: true,
    status: 204,
    statusText: "No data to update",
    data: {
      farm: farmSlug,
      site: siteSlug,
      lastUpdate,
      daysBeforeUpdate,
      updatedData: [],
      closeAt: closedAt,
    },
  };
}

function searchDaysToUpdate(miningData: MiningData[], site?: Site) {
  const updateAll = miningData.length === 0;
  const yesterday = getYesterdayDate();
  const today = getTodayDate();
  const lastUpdate = updateAll
    ? undefined
    : convertToUTCStartOfDay(new Date((miningData[0] as MiningData).day)); // if undefined, update all the data
  let daysBeforeUpdate = 0;
  if (updateAll) {
    if (site?.started_at) {
      console.log("UPDATING mining site started at", site.started_at);
      const start = new Date(site.started_at);
      daysBeforeUpdate = calculateDaysBetweenDates(start, today);
    } else {
      console.warn("UPDATING mining ALL DATA", site.slug);
      // update max days
      daysBeforeUpdate = 500;
    }
  }
  if (lastUpdate && yesterday.getTime() > lastUpdate.getTime()) {
    // update day requiered
    daysBeforeUpdate = calculateDaysBetweenDates(lastUpdate, yesterday);
  }

  return { updateAll, daysBeforeUpdate, lastUpdate };
}

async function insertPoolDataInMiningTable(
  supabase,
  farm: string,
  data: DayPoolData[]
) {
  if (data.length === 0) return;

  const row: Database["public"]["Tables"]["mining"]["Insert"][] = data.map(
    (d) => {
      //console.log("Inserting mining data", d.date);
      return {
        farmSlug: farm,
        hashrateTHs: d.hashrateTHs,
        mined: d.revenue,
        uptime: d.efficiency,
        siteSlug: d.site,
        day: d.date,
      };
    }
  );

  const { error } = await supabase.from("mining").insert(row).select();
  if (error) {
    console.error("Error while inserting mining data", error);
    throw new Error("Error while inserting mining data " + error);
  }
}