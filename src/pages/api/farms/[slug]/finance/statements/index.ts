import { NextApiRequest, NextApiResponse } from "next";
import { SupabaseClient } from "@supabase/supabase-js";
import { convertDateToTimestamptzFormat, getTodayDate } from "@/tools/date";
import { getSupabaseClient } from "@/databases/supabase";
import { LRUCache } from "lru-cache";

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
  const { slug, start, end } = req.query;

  if (!slug) {
    return res.status(400).json({ error: "Farm name parameter missing." });
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

  const cacheKey = `financial-statements_${slug}${
    start ? "_start_" + start : ""
  }${end ? "_end_" + end : ""}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log("GET FINANCIAL STATEMENTS PASS WITH CACHE");
    return res.status(200).json(cachedData);
  }

  const dateMin = start
    ? convertDateToTimestamptzFormat(new Date(start.toString()))
    : undefined;
  const dateMax = end
    ? convertDateToTimestamptzFormat(new Date(end.toString()))
    : undefined;

  console.log("Statements ", slug);
  console.log("dateMin", dateMin);
  console.log("dateMax", dateMax);

  try {
    console.log("Récupération du mining  " + slug);
    const farmSlug = slug.toString();
    const supabaseClient = getSupabaseClient();

    const { data: financialData, error: financialError } =
      await fetchFinancialStatementsData(
        supabaseClient,
        farmSlug,
        dateMin,
        dateMax
      );

    if (financialError) {
      console.error(
        "Erreur lors de la récupération de la ferme :",
        financialError
      );
      return res.status(500).json({
        error: "Erreur serveur lors de la récupération de la ferme.",
      });
    }

    // Mettre en cache la réponse pour la durée spécifiée
    cache.set(cacheKey, financialData);
    console.log("GET FINANCIAL STATEMENTS PASS NO CACHE");

    // Retourner la réponse
    return res.status(200).json(financialData);
  } catch (error) {
    console.error("Erreur lors de la récupération de la ferme :", error);
    return res
      .status(500)
      .json({ error: "Erreur serveur lors de la récupération de la ferme." });
  }
}

async function fetchFinancialStatementsData(
  supabase: SupabaseClient,
  slug: string,
  dateMin: string | undefined,
  dateMax: string | undefined
): Promise<{ data: unknown; error: unknown }> {
  if (dateMin && dateMax) {
    console.log(
      "Récupération du financial statements depuis le " +
        dateMin +
        " jusqu'au " +
        dateMax
    );
    return await supabase
      .from("financialStatements")
      .select()
      .eq("farmSlug", slug)
      .gte("end", dateMin)
      .lt("start", dateMax);
  } else if (dateMin) {
    console.log("Récupération du financial statements depuis le " + dateMin);
    return await supabase
      .from("financialStatements")
      .select()
      .eq("farmSlug", slug)
      .gte("end", dateMin);
  } else if (dateMax) {
    console.log("Récupération du financial statements jusqu'au " + dateMax);
    return await supabase
      .from("financialStatements")
      .select()
      .eq("farmSlug", slug)
      .lt("start", dateMax);
  } else {
    return await supabase
      .from("financialStatements")
      .select()
      .eq("farmSlug", slug);
  }
}
