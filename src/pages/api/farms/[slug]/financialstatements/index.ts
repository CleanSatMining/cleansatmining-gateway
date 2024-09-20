import { NextApiRequest, NextApiResponse } from "next";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { convertDateToTimestamptzFormat } from "@/tools/date";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug, datemin, datemax } = req.query;

  if (!slug) {
    return res.status(400).json({ error: "Paramètre slug manquant." });
  }

  console.log("dateMin", datemin);

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
    const farmSlug = slug.toString();
    const supabaseClient = getSupabaseClient();

    const { data: miningData, error: miningError } = await fetchMiningData(
      supabaseClient,
      farmSlug,
      dateMin,
      dateMax
    );

    console.log("miningData", miningData);

    if (miningError) {
      console.error(
        "Erreur lors de la récupération de la ferme :",
        miningError
      );
      return res.status(500).json({
        error: "Erreur serveur lors de la récupération de la ferme.",
      });
    }

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

    return res.status(200).json(financialData);
  } catch (error) {
    console.error("Erreur lors de la récupération de la ferme :", error);
    return res
      .status(500)
      .json({ error: "Erreur serveur lors de la récupération de la ferme." });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabaseClient(): SupabaseClient<any, "public", any> {
  const apiKey = process.env.SUPABASE_API_KEY;
  const supabaseUrl = process.env.SUPABASE_API_URL;
  if (!apiKey) {
    throw new Error("API key is missing.");
  }
  if (!supabaseUrl) {
    throw new Error("Supabase URL is missing.");
  }

  return createClient(supabaseUrl, apiKey);
}

async function fetchMiningData(
  supabase: SupabaseClient,
  slug: string,
  dateMin: string | undefined,
  dateMax: string | undefined
): Promise<{ data: unknown; error: unknown }> {
  if (dateMin && dateMax) {
    console.log(
      "Récupération du mining depuis le " + dateMin + " jusqu'au " + dateMax
    );
    return await supabase
      .from("mining")
      .select()
      .eq("farmSlug", slug)
      .gte("day", dateMin)
      .lte("day", dateMax);
  } else if (dateMin) {
    console.log("Récupération du mining depuis le " + dateMin);
    return await supabase
      .from("mining")
      .select()
      .eq("farmSlug", slug)
      .gte("day", dateMin);
  } else if (dateMax) {
    console.log("Récupération du mining jusqu'au " + dateMax);
    return await supabase
      .from("mining")
      .select()
      .eq("farmSlug", slug)
      .lte("day", dateMax);
  } else {
    return await supabase.from("mining").select().eq("farmSlug", slug);
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
      .lte("start", dateMax);
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
      .lte("start", dateMax);
  } else {
    return await supabase
      .from("financialStatements")
      .select()
      .eq("farmSlug", slug);
  }
}
