/* eslint-disable import/no-anonymous-default-export */
import type { Context } from "@netlify/functions";
import {
  getSupabaseClient,
  signIn,
  signOut,
} from "../../src/databases/supabase";

import {
  updateAllMiningHistory,
  updateFarmMiningHistory,
  updateMiningHistory,
} from "./update-mining-history.mjs";

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
