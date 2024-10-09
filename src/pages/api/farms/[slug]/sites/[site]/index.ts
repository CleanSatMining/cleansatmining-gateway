import { NextApiRequest, NextApiResponse } from "next";
import { GET_SUPABASE_SITES } from "@/constants/apis";
import {
  SiteApiResponse,
  Site,
  mapSiteApiResponseToSite,
} from "@/types/supabase.extend";
import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/databases/supabase";
import { LRUCache } from "lru-cache";

const CACHE_DURATION_SECONDS = 8 * 60 * 60; // 8 heures
/* eslint-disable */
const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * CACHE_DURATION_SECONDS,
});
/* eslint-enable */

const DATA_NOT_FOUND = "Data not found";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug: farm, site } = req.query;
  if (!farm || typeof farm !== "string") {
    return res.status(400).json({ error: "Farm name parameter missing" });
  }
  if (!site || typeof site !== "string") {
    return res.status(400).json({ error: "Site name parameter missing" });
  }

  const cacheKey = `farm_${farm}_site_${site}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log("GET SITE PASS WITH CACHE");
    return res.status(200).json(cachedData);
  }

  console.log("GET SITE", farm, site);
  try {
    const siteApiResponse = await fetchSite(getSupabaseClient(), farm, site);
    if (siteApiResponse === null) {
      return res.status(404).json({ error: DATA_NOT_FOUND });
    }

    const siteData: Site = mapSiteApiResponseToSite(siteApiResponse);

    // Mettre en cache la réponse pour la durée spécifiée
    cache.set(cacheKey, siteData);
    console.log("GET SITE PASS NO CACHE");

    // Retourner la réponse
    return res.status(200).json(siteData);
  } catch (error) {
    console.error("Erreur lors de la récupération du site :", error);
    return res
      .status(500)
      .json({ error: "Erreur serveur lors de la récupération du site." });
  }
}

async function fetchSite(
  supabase: SupabaseClient,
  farm: string,
  site: string
): Promise<SiteApiResponse | null> {
  const selectQuery = GET_SUPABASE_SITES.parameters.select.full();

  const { data, error } = await supabase
    .from("sites")
    .select()
    .eq("slug", site.trim())
    .eq("farmSlug", farm.trim())
    .select(selectQuery);

  if (error) {
    console.error("Erreur lors de la récupération du site :", error);
    throw new Error("Erreur lors de la récupération du site");
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.error(DATA_NOT_FOUND);
    return null;
  }
  const siteData: SiteApiResponse = data[0] as unknown as SiteApiResponse;

  return siteData;
}
