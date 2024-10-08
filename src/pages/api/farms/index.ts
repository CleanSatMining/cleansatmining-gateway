import { NextApiRequest, NextApiResponse } from "next";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/databases/supabase";

const DATA_NOT_FOUND = "Data not found";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("GET ALL FARMS");
    const farms = await fetchFarms(getSupabaseClient());

    if (farms === null) {
      return res.status(404).json({ error: DATA_NOT_FOUND });
    }

    return res.status(200).json(farms);
  } catch (error) {
    console.error("Server error while retrieving farms. :", error);
    return res
      .status(500)
      .json({ error: "Server error while retrieving farms." });
  }
}

async function fetchFarms(
  supabase: SupabaseClient
): Promise<Database["public"]["Tables"]["farms"]["Row"][] | null> {
  const { data, error } = await supabase.from("farms").select("*");

  if (error) {
    console.error("Error while requesting farms :", error);
    throw new Error("Error while requesting farms " + error);
  }

  if (!Array.isArray(data)) {
    console.error("Invalid data format received from Supabase");
    return null;
  }
  const farms: Database["public"]["Tables"]["farms"]["Row"][] =
    data as unknown as Database["public"]["Tables"]["farms"]["Row"][];

  return farms;
}
