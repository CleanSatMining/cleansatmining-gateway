import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { convertDateToTimestamptzFormat } from "@/tools/date";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug, datemin, datemax } = req.query;

  if (!slug) {
    return res.status(400).json({ error: "Paramètre slug manquant." });
  }

  const dateMin = datemin
    ? convertDateToTimestamptzFormat(new Date(datemin.toString()))
    : undefined;
  const dateMax = datemax
    ? convertDateToTimestamptzFormat(new Date(datemax.toString()))
    : undefined;

  console.log("dateMin", dateMin);
  console.log("dateMax", dateMax);

  try {
    console.log("Récupération du mining  " + slug);

    const { data, error } = await fetchMiningData(dateMin, dateMax);

    if (error) {
      console.error("Erreur lors de la récupération de la ferme :", error);
      return res.status(500).json({
        error: "Erreur serveur lors de la récupération de la ferme.",
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Erreur lors de la récupération de la ferme :", error);
    return res
      .status(500)
      .json({ error: "Erreur serveur lors de la récupération de la ferme." });
  }
}

async function fetchMiningData(
  dateMin: string | undefined,
  dateMax: string | undefined
): Promise<{ data: unknown; error: unknown }> {
  const apiKey = process.env.SUPABASE_API_KEY;
  const supabaseUrl = process.env.SUPABASE_API_URL;
  console.log("apiKey", apiKey);
  console.log("supabaseUrl", supabaseUrl);
  if (!apiKey) {
    throw new Error("API key is missing.");
  }
  if (!supabaseUrl) {
    throw new Error("Supabase URL is missing.");
  }

  const supabase = createClient(supabaseUrl, apiKey);

  if (dateMin && dateMax) {
    console.log(
      "Récupération du mining depuis le " + dateMin + " jusqu'au " + dateMax
    );
    return await supabase
      .from("mining")
      .select()
      .gte("day", dateMin)
      .lte("day", dateMax);
  } else if (dateMin) {
    console.log("Récupération du mining depuis le " + dateMin);
    return await supabase.from("mining").select().gte("day", dateMin);
  } else if (dateMax) {
    console.log("Récupération du mining jusqu'au " + dateMax);
    return await supabase.from("mining").select().lte("day", dateMax);
  } else {
    return await supabase.from("mining").select();
  }
}
