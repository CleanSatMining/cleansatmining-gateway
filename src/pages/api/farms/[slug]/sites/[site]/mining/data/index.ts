import { NextApiRequest, NextApiResponse } from "next";
import { fetchSitePoolData } from "@/resources/pools/site";
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

  if (!farm || typeof farm !== "string") {
    return res
      .status(400)
      .json({ error: "Parameter farm missing or incorrect." });
  }

  if (!site || typeof site !== "string") {
    return res
      .status(400)
      .json({ error: "Parameter site missing or incorrect." });
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

  const dateMin = start
    ? convertDateToTimestamptzFormat(new Date(start.toString()))
    : undefined;
  const dateMax = end
    ? convertDateToTimestamptzFormat(new Date(end.toString()))
    : undefined;

  try {
    console.log(
      "GET MINING HISTORY  " + farm + " " + site,
      dateMin,
      dateMax,
      first ? "first: " + first : ""
    );
    const farmSlug = farm.toString();

    console.log("FARM MINING DATA", farmSlug, site.toString());
    const { ok, poolData } = await fetchSitePoolData(
      farmSlug,
      site.toString(),
      Number(first) || 1,
      dateMin,
      dateMax
    );

    if (ok === false) {
      console.error("Erreur lors de la récupération des données");
      return res.status(500).json({
        error: "Erreur lors de la récupération des données",
      });
    }

    // Cache the response for future use

    return res.status(200).json(poolData);
  } catch (error) {
    console.error("Erreur lors de la récupération de la ferme :", error);
    return res
      .status(500)
      .json({ error: "Erreur serveur lors de la récupération de la ferme." });
  }
}
