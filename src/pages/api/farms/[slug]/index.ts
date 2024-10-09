import { NextApiRequest, NextApiResponse } from "next";
import { GET_SUPABASE_FARMS } from "@/constants/apis";
import {
  FarmApiResponse,
  Farm,
  mapFarmApiResponseToFarm,
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
  const { slug: farm } = req.query;
  if (!farm) {
    return res.status(400).json({ error: "Farm name parameter missing" });
  }

  const cacheKey = `farm_${farm}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log("GET FARM PASS WITH CACHE");
    return res.status(200).json(cachedData);
  }

  try {
    console.log("Get the farm " + farm);
    const farmApiResponse = await fetchFarm(
      getSupabaseClient(),
      farm.toString()
    );

    //const farmApiResponse = await getFarmByApi(slug.toString());
    if (farmApiResponse === null) {
      return res.status(404).json({ error: DATA_NOT_FOUND });
    }

    const farmData: Farm = mapFarmApiResponseToFarm(farmApiResponse);

    // Mettre en cache la réponse pour la durée spécifiée
    cache.set(cacheKey, farmData);
    console.log("GET FARM PASS NO CACHE");

    // Retourner la réponse
    return res.status(200).json(farmData);
  } catch (error) {
    console.error("Error while fetching farm " + farm, error);
    return res
      .status(500)
      .json({ error: "Error while fetching farm " + farm + " : " + error });
  }
}

async function fetchFarm(
  supabase: SupabaseClient,
  slug: string
): Promise<FarmApiResponse | null> {
  const selectFarm = GET_SUPABASE_FARMS.parameters.select.full();

  const { data, error } = await supabase
    .from("farms")
    .select()
    .eq("slug", slug)
    .select(selectFarm);

  if (error) {
    console.error("Erreur lors de la récupération de la ferme :", error);
    throw new Error("Erreur lors de la récupération de la ferme");
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.error("Invalid data format received from Supabase");
    return null;
  }
  const farm: FarmApiResponse = data[0] as unknown as FarmApiResponse;

  return farm;
}
