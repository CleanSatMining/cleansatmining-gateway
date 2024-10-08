import { NextApiRequest, NextApiResponse } from "next";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  convertDateToTimestamptzFormat,
  convertToUTCStartOfDay,
} from "@/tools/date";
import { getSupabaseClient } from "@/databases/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug, site, start, end, first } = req.query;

  if (!slug) {
    return res
      .status(400)
      .json({ error: "Paramètre nom de la ferme manquant." });
  }

  if (!site) {
    return res.status(400).json({ error: "Paramètre nom du site manquant." });
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

  if (first && isNaN(Number(first))) {
    return new Response("Invalid parameter 'first'", { status: 400 });
  }

  const dateMin = start
    ? convertDateToTimestamptzFormat(new Date(start.toString()))
    : undefined;
  const dateMax = end
    ? convertDateToTimestamptzFormat(new Date(end.toString()))
    : undefined;

  try {
    console.log("MINING HISTORY  " + slug + " " + site);
    const farmSlug = slug.toString();
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
): Promise<{ data: unknown; error: unknown }> {
  console.log("SUPABASE mining history", farm, site);
  if (dateMin && dateMax) {
    console.log(
      "Récupération du mining depuis le " + dateMin + " jusqu'au " + dateMax
    );

    return await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .eq("siteSlug", site)
      .gte("day", dateMin)
      .lt("day", dateMax);
  } else if (dateMin) {
    console.log("Récupération du mining depuis le " + dateMin);
    return await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .eq("siteSlug", site)
      .gte("day", dateMin);
  } else if (dateMax) {
    console.log("Récupération du mining jusqu'au " + dateMax);
    return await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .eq("siteSlug", site)
      .lt("day", dateMax);
  } else if (first) {
    console.log("Récupération des " + first + " dernières lignes de mining");
    return await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .eq("siteSlug", site)
      .order("day", { ascending: false })
      .limit(first);
  } else {
    return await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .eq("siteSlug", site);
  }
}
