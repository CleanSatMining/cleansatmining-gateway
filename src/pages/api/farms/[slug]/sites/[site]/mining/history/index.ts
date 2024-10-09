import { NextApiRequest, NextApiResponse } from "next";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  convertDateToKey,
  convertDateToTimestamptzFormat,
  convertToUTCStartOfDay,
} from "@/tools/date";
import { getSupabaseClient } from "@/databases/supabase";
import { Database } from "@/types/supabase";
import { LRUCache } from "lru-cache";

const CACHE_DURATION_SECONDS = 8 * 60 * 60; // 8 heures
/* eslint-disable */
const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * CACHE_DURATION_SECONDS,
});
/* eslint-enable */

interface CachedData {
  upatedAt: string;
  data: Database["public"]["Tables"]["mining"]["Row"][];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug: farm, site, start, end, first } = req.query;

  if (!farm) {
    return res.status(400).json({ error: "Parameter farm missing." });
  }

  if (!site) {
    return res.status(400).json({ error: "Parameter site missing." });
  }

  const todayUTC = convertToUTCStartOfDay(new Date());

  if (start && (typeof start !== "string" || !Date.parse(start))) {
    return new Response("Invalid start date", { status: 400 });
  }
  if (end && (typeof end !== "string" || !Date.parse(end))) {
    return new Response("Invalid end date", { status: 400 });
  }

  if (start && end && new Date(start) >= new Date(end)) {
    return new Response("Start date is greater than end date", { status: 400 });
  }
  if (start && end && new Date(start) >= todayUTC) {
    return new Response("Start date is greater than current date", {
      status: 400,
    });
  }

  if (end && new Date(end) > todayUTC) {
    return new Response("End date is greater than current date", {
      status: 400,
    });
  }

  if (first && (isNaN(Number(first)) || Number(first) <= 0)) {
    return new Response("Invalid parameter 'first'", { status: 400 });
  }

  // Cache management
  const cacheKey = `mining-history_${farm}_${site}${
    start ? "_start_" + start : ""
  }${end ? "_end_" + end : ""}${first ? "_first_" + first : ""}`;
  console.log("MINING cacheKey", cacheKey);

  const cachedData: CachedData = cache.get(cacheKey);
  console.log(
    "MINING cachedData",
    JSON.stringify(cachedData?.upatedAt, null, 2)
  );
  if (cachedData && new Date(cachedData.upatedAt) >= todayUTC) {
    console.log("GET MINING HISTORY PASS WITH CACHE");
    return res.status(200).json(cachedData.data);
  }

  const dateMin = start
    ? convertDateToTimestamptzFormat(new Date(start.toString()))
    : undefined;
  const dateMax = end
    ? convertDateToTimestamptzFormat(new Date(end.toString()))
    : undefined;

  try {
    console.log("MINING HISTORY  " + farm + " " + site);
    const farmSlug = farm.toString();
    const supabaseClient = getSupabaseClient();

    const { data: miningData, error: miningError } = await fetchMiningData(
      supabaseClient,
      farmSlug,
      site.toString(),
      dateMin,
      dateMax,
      first ? Number(first) : undefined
    );

    if (miningError) {
      console.error(
        "Erreur lors de la récupération de la ferme :",
        miningError
      );
      return res.status(500).json({
        error: "Erreur serveur lors de la récupération de la ferme.",
      });
    }

    // Cache the response for future use
    const newCachedData: CachedData = {
      upatedAt: convertDateToKey(new Date()),
      data: miningData,
    };
    cache.set(cacheKey, newCachedData);
    console.log(
      "GET MINING HISTORY PASS NO CACHE",
      JSON.stringify(newCachedData.upatedAt)
    );

    return res.status(200).json(miningData);
  } catch (error) {
    console.error("Erreur lors de la récupération de la ferme :", error);
    return res
      .status(500)
      .json({ error: "Erreur serveur lors de la récupération de la ferme." });
  }
}

async function fetchMiningData(
  supabase: SupabaseClient,
  farm: string,
  site: string,
  dateMin: string | undefined,
  dateMax: string | undefined,
  first?: number
): Promise<{
  data: Database["public"]["Tables"]["mining"]["Row"][];
  error: unknown;
}> {
  console.log("SUPABASE mining history", farm, site);
  if (dateMin && dateMax) {
    console.log(
      "Récupération du mining depuis le " + dateMin + " jusqu'au " + dateMax
    );

    const { data, error } = await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .eq("siteSlug", site)
      .gte("day", dateMin)
      .lt("day", dateMax);
    return {
      data: data as Database["public"]["Tables"]["mining"]["Row"][],
      error: error,
    };
  } else if (dateMin) {
    console.log("Récupération du mining depuis le " + dateMin);
    const { data, error } = await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .eq("siteSlug", site)
      .gte("day", dateMin);
    return {
      data: data as Database["public"]["Tables"]["mining"]["Row"][],
      error: error,
    };
  } else if (dateMax) {
    console.log("Récupération du mining jusqu'au " + dateMax);
    const { data, error } = await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .eq("siteSlug", site)
      .lt("day", dateMax);
    return {
      data: data as Database["public"]["Tables"]["mining"]["Row"][],
      error: error,
    };
  } else if (first) {
    console.log("Récupération des " + first + " dernières lignes de mining");
    const { data, error } = await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .eq("siteSlug", site)
      .order("day", { ascending: false })
      .limit(first);
    return {
      data: data as Database["public"]["Tables"]["mining"]["Row"][],
      error: error,
    };
  } else {
    const { data, error } = await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .eq("siteSlug", site);
    return {
      data: data as Database["public"]["Tables"]["mining"]["Row"][],
      error: error,
    };
  }
}
