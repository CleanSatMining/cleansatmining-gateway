import { NextApiRequest, NextApiResponse } from "next";
import { GET_SITES } from "@/constants/apis";
import {
  SiteApiResponse,
  Site,
  mapSiteApiResponseToSite,
} from "@/types/supabase.extend";

import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/databases/supabase";

const DATA_NOT_FOUND = "Data not found";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug, siteSlug } = req.query;
  if (!slug) {
    return res.status(400).json({ error: "Paramètre ferme manquant." });
  }
  if (!siteSlug) {
    return res.status(400).json({ error: "Paramètre site manquant." });
  }

  try {
    console.log("Récupération du site +" + siteSlug + "+");
    const siteApiResponse = await fetchSite(
      getSupabaseClient(),
      siteSlug.toString()
    );
    if (siteApiResponse === null) {
      return res.status(404).json({ error: DATA_NOT_FOUND });
    }

    const site: Site = mapSiteApiResponseToSite(siteApiResponse);

    return res.status(200).json(site);
  } catch (error) {
    console.error("Erreur lors de la récupération du site :", error);
    return res
      .status(500)
      .json({ error: "Erreur serveur lors de la récupération du site." });
  }
}

async function fetchSite(
  supabase: SupabaseClient,
  siteSlug: string
): Promise<SiteApiResponse | null> {
  const selectQuery = GET_SITES.parameters.select.full();

  console.log("Parametres :", selectQuery);

  const { data, error } = await supabase
    .from("sites")
    .select()
    .eq("slug", siteSlug.trim())
    .select(selectQuery);

  if (error) {
    console.error("Erreur lors de la récupération du site :", error);
    throw new Error("Erreur lors de la récupération du site");
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.error(DATA_NOT_FOUND);
    return null;
  }
  const farm: SiteApiResponse = data[0] as unknown as SiteApiResponse;

  return farm;
}
