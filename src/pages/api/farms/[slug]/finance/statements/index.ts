import { NextApiRequest, NextApiResponse } from "next";
import { SupabaseClient } from "@supabase/supabase-js";
import { convertDateToTimestamptzFormat } from "@/tools/date";
import { getSupabaseClient } from "@/databases/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug, start, end } = req.query;

  if (!slug) {
    return res
      .status(400)
      .json({ error: "Paramètre nom de la ferme manquant." });
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
