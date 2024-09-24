import { NextApiRequest, NextApiResponse } from "next";
import { createParameters, GET_FARMS } from "@/constants/apis";
import {
  FarmApiResponse,
  Farm,
  mapFarmApiResponseToFarm,
} from "@/types/supabase.extend";
import { OP } from "@/constants/supabase.config";
import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/databases/supabase";

const DATA_NOT_FOUND = "Data not found";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query;
  if (!slug) {
    return res.status(400).json({ error: "Paramètre slug manquant." });
  }

  try {
    console.log("Récupération de la ferme " + slug);
    const farmApiResponse = await fetchFarm(
      getSupabaseClient(),
      slug.toString()
    );

    //const farmApiResponse = await getFarmByApi(slug.toString());
    if (farmApiResponse === null) {
      return res.status(404).json({ error: DATA_NOT_FOUND });
    }

    const farm: Farm = mapFarmApiResponseToFarm(farmApiResponse);

    return res.status(200).json(farm);
  } catch (error) {
    console.error("Erreur lors de la récupération de la ferme :", error);
    return res
      .status(500)
      .json({ error: "Erreur serveur lors de la récupération de la ferme." });
  }
}

async function getFarmByApi(slug: string): Promise<FarmApiResponse> {
  const parameters = createParameters({
    select: GET_FARMS.parameters.select.full(),
    slug: OP.EQUALS(slug.toString()),
  });

  console.log("Parametres :", parameters);

  const url = process.env.SUPABASE_API_URL + GET_FARMS.url + parameters;
  const apiKey = process.env.SUPABASE_API_KEY;
  if (!apiKey) {
    //return res.status(500).json({ error: "API key is missing." });
    throw new Error("API key is missing.");
  }
  //const headers = GET_FARMS.headers
  const response = await fetch(url, {
    method: GET_FARMS.method, // ou "POST", "PUT", etc.
    headers: {
      ...GET_FARMS.headers,
      apiKey: apiKey, // Ajouter la clé apiKey dans les headers
    } as HeadersInit,
  });

  const jsonData: FarmApiResponse[] = await response.json();
  const farmApiResponse = jsonData[0];

  return farmApiResponse;
}

async function fetchFarm(
  supabase: SupabaseClient,
  slug: string
): Promise<FarmApiResponse | null> {
  const selectFarm = GET_FARMS.parameters.select.full();

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
