import { NextApiRequest, NextApiResponse } from "next";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  convertDateToKey,
  convertDateToTimestamptzFormat,
  getTodayDate,
} from "@/tools/date";
import { getSupabaseClient } from "@/databases/supabase";
import { Database } from "@/types/supabase";
import { LRUCache } from "lru-cache";

interface CachedData {
  upatedAt: string;
  data: Database["public"]["Tables"]["mining"]["Row"][];
}

const CACHE_DURATION_SECONDS = 8 * 60 * 60; // 8 heures
/* eslint-disable */
const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * CACHE_DURATION_SECONDS,
});
/* eslint-enable */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug: farm, start, end, first } = req.query;

  if (!farm) {
    return res.status(400).json({ error: "Parameter farm missing." });
  }

  if (start && (typeof start !== "string" || !Date.parse(start))) {
    return res.status(400).json({ error: "Invalid start date" });
  }
  if (end && (typeof end !== "string" || !Date.parse(end))) {
    return res.status(400).json({ error: "Invalid end date" });
  }
  if (start && end && new Date(start) >= new Date(end)) {
    return res
      .status(400)
      .json({ error: "Start date is greater or equal than end date" });
  }
  const todayUTC = getTodayDate();
  if (start && new Date(start) >= todayUTC) {
    return res
      .status(400)
      .json({ error: "Start date is greater or equal than current date" });
  }
  if (end && new Date(end) > todayUTC) {
    return res
      .status(400)
      .json({ error: "End date is greater than current date" });
  }

  if (first && (isNaN(Number(first)) || Number(first) <= 0)) {
    return res.status(400).json({ error: "Invalid parameter 'first'" });
  }

  // Cache management
  const cacheKey = `mining-history_${farm}${start ? "_start_" + start : ""}${
    end ? "_end_" + end : ""
  }${first ? "_first_" + first : ""}`;
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

  // fetch mining data
  console.log("first", first);

  const dateMin = start
    ? convertDateToTimestamptzFormat(new Date(start.toString()))
    : undefined;
  const dateMax = end
    ? convertDateToTimestamptzFormat(new Date(end.toString()))
    : undefined;

  try {
    console.log("Récupération du mining  " + farm);
    const farmSlug = farm.toString();
    const supabaseClient = getSupabaseClient();

    const { data: miningData, error: miningError } = await fetchMiningData(
      supabaseClient,
      farmSlug,
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
  slug: string,
  dateMin: string | undefined,
  dateMax: string | undefined,
  first?: number
): Promise<{
  data: Database["public"]["Tables"]["mining"]["Row"][];
  error: unknown;
}> {
  if (dateMin && dateMax) {
    console.log(
      "Récupération du mining depuis le " + dateMin + " jusqu'au " + dateMax
    );
    const { data, error } = await supabase
      .from("mining")
      .select()
      .eq("farmSlug", slug)
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
      .eq("farmSlug", slug)
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
      .eq("farmSlug", slug)
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
      .eq("farmSlug", slug)
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
      .eq("farmSlug", slug);
    return {
      data: data as Database["public"]["Tables"]["mining"]["Row"][],
      error: error,
    };
  }
}
