import { NextApiRequest, NextApiResponse } from "next";
import { createParameters, GET_FARMS } from "@/constants/apis";
import {
  FarmApiResponse,
  Farm,
  mapFarmApiResponseToFarm,
} from "@/types/supabase.extend";
import { OP } from "@/constants/supabase.config";

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

    const parameters = createParameters({
      select: GET_FARMS.parameters.select.full(),
      slug: OP.EQUALS(slug.toString()),
    });

    console.log("Parametres :", parameters);

    const url = process.env.SUPABASE_API_URL + GET_FARMS.url + parameters;

    const response = await fetch(url, {
      method: GET_FARMS.method, // ou "POST", "PUT", etc.
      headers: GET_FARMS.headers,
    });

    const jsonData: FarmApiResponse[] = await response.json();
    const farmApiResponse = jsonData[0];

    const farm: Farm = mapFarmApiResponseToFarm(farmApiResponse);

    return res.status(200).json(farm);
  } catch (error) {
    console.error("Erreur lors de la récupération de la ferme :", error);
    return res
      .status(500)
      .json({ error: "Erreur serveur lors de la récupération de la ferme." });
  }
}
