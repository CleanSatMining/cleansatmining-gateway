/* eslint-disable import/no-anonymous-default-export */
import type { Context } from "@netlify/functions";
import { Database } from "../../src/types/supabase";
import {
  getSupabaseClient,
  signIn,
  signOut,
} from "../../src/databases/supabase";
import { fetchMiningHistory } from "../../src/resources/mininghistory";

import { MiningData } from "../../src/types/MiningHistory";
import {
  getYesterdayDate,
  convertToUTCStartOfDay,
  calculateDaysBetweenDates,
} from "../../src/tools/date";
import { DayPoolData } from "../../src/types/Pool";
import { fetchSitePoolData } from "../../src/resources/site";
import { SupabaseClient } from "@supabase/supabase-js";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const farm = url.searchParams.get("farm") || "undefined";
  const site = url.searchParams.get("site") || "undefined";
  const username = process.env.SUPABASE_ADMIN_USER ?? "";
  const password = process.env.SUPABASE_ADMIN_PASSWORD ?? "";

  const supabase = getSupabaseClient();
  await signIn(supabase, username, password);

  const response = await updateMiningHistory(supabase, farm, site);

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

async function updateMiningHistory(
  supabase: SupabaseClient,
  farm: string,
  site: string
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  data?: {
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

  //console.log("Mining data", JSON.stringify(miningData));

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
        lastUpdate,
        daysBeforeUpdate,
        updatedData: [],
        closeAt: poolResponse.closedAt,
      },
    };
  }
  try {
    insertMiningData(supabase, farm, daysPoolData);
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
      lastUpdate,
      daysBeforeUpdate,
      updatedData: daysPoolData,
      closeAt: poolResponse.closedAt,
    },
  };
}

function searchDaysToUpdate(miningData: MiningData[]) {
  const updateAll = miningData.length === 0;
  const yesterday = getYesterdayDate();
  const lastUpdate = updateAll
    ? undefined
    : convertToUTCStartOfDay(new Date((miningData[0] as MiningData).day)); // if undefined, update all the data
  let daysBeforeUpdate = 500;

  if (lastUpdate && yesterday.getTime() > lastUpdate.getTime()) {
    // update mining history
    daysBeforeUpdate = calculateDaysBetweenDates(lastUpdate, yesterday);
  }
  return { updateAll, daysBeforeUpdate, lastUpdate };
}

async function insertMiningData(supabase, farm: string, data: DayPoolData[]) {
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

  /* const { error } = await supabase.from("mining").insert(row).select();
  if (error) {
    console.error("Error while inserting mining data", error);
    throw new Error("Error while inserting mining data " + error);
  } */
}
