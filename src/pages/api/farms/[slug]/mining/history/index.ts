import { NextApiRequest, NextApiResponse } from "next";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  convertDateToKey,
  convertDateToTimestamptzFormat,
  getTodayDate,
} from "@/tools/date";
import { getSupabaseClient, signIn, signOut } from "@/databases/supabase";
import { Database } from "@/types/supabase";
import { LRUCache } from "lru-cache";
import { DayPoolData } from "@/types/Pool";
const RETRY_MAX = 3;
interface CachedData {
  upatedAt: string;
  data: Database["public"]["Tables"]["mining"]["Row"][];
}

const CACHE_DURATION_SECONDS = 8 * 60 * 60; // 8 heures
/* eslint-disable */
const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * CACHE_DURATION_SECONDS,
});
/* eslint-enable */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    return handlePostRequest(req, res);
  }

  return handleGetRequest(req, res);
}

export async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // get the body of the request
  const { user, password, rows } = req.body;
  const { slug: farm } = req.query;

  if (!farm && typeof farm !== "string") {
    return res.status(400).json({ error: "Invalid farm parameter" });
  }

  if (!user || !password || !rows) {
    return res.status(400).json({
      error: "Missing parameters in the request body",
    });
  }
  if (typeof user !== "string") {
    return res.status(400).json({
      error: "Invalid parameter 'user'",
    });
  }
  if (typeof password !== "string") {
    return res.status(400).json({
      error: "Invalid parameter 'password'",
    });
  }
  if (!Array.isArray(rows)) {
    return res.status(400).json({
      error: "Invalid parameter 'rows'",
    });
  }
  if (rows.length === 0) {
    return res.status(400).json({
      error: "Empty parameter 'rows'",
    });
  }
  //verify tha rows ar of type DayPoolData
  const rowsTyped = rows as DayPoolData[];
  if (
    !rowsTyped.every((row) => {
      return (
        typeof row.date === "string" &&
        typeof row.site === "string" &&
        typeof row.efficiency === "number" &&
        typeof row.revenue === "number" &&
        typeof row.uptimePercentage === "number" &&
        typeof row.uptimeTotalMinutes === "number" &&
        typeof row.uptimeTotalMachines === "number" &&
        typeof row.hashrateTHs === "number"
      );
    })
  ) {
    return res.status(400).json({
      error: "Invalid parameter 'rows'",
    });
  }

  //const supabase = getSupabaseClient();

  /*await insertPoolDataInMiningTable(
    supabase,
    user,
    password,
    farm.toString(),
    rowsTyped
  );*/

  const response = await insertPoolDataInMiningTable2(
    user,
    password,
    farm.toString(),
    rowsTyped
  );

  if (response.error) {
    return res.status(500).json({ error: response.error });
  }

  return res
    .status(200)
    .json({ message: "Data inserted " + JSON.stringify(response) });
}

export async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug: farm, start, end, first, cache: cacheInput } = req.query;

  if (!farm) {
    return res.status(400).json({ error: "Parameter farm missing." });
  }

  if (start && (typeof start !== "string" || !Date.parse(start))) {
    return res.status(400).json({ error: "Invalid start date" });
  }
  if (end && (typeof end !== "string" || !Date.parse(end))) {
    return res.status(400).json({ error: "Invalid end date" });
  }
  if (start && end && new Date(start) >= new Date(end)) {
    return res
      .status(400)
      .json({ error: "Start date is greater or equal than end date" });
  }
  const todayUTC = getTodayDate();
  if (start && new Date(start) >= todayUTC) {
    return res
      .status(400)
      .json({ error: "Start date is greater or equal than current date" });
  }
  if (end && new Date(end) > todayUTC) {
    return res
      .status(400)
      .json({ error: "End date is greater than current date" });
  }

  if (first && (isNaN(Number(first)) || Number(first) <= 0)) {
    return res.status(400).json({ error: "Invalid parameter 'first'" });
  }

  // Cache management
  const cacheKey = `mining-history_${farm}${start ? "_start_" + start : ""}${
    end ? "_end_" + end : ""
  }${first ? "_first_" + first : ""}`;

  const cacheEnable = cacheInput ? cacheInput !== "false" : true;

  const cachedData: CachedData = cache.get(cacheKey);
  console.log(
    "MINING cachedData",
    JSON.stringify(cachedData?.upatedAt, null, 2)
  );

  if (cacheEnable && cachedData && new Date(cachedData.upatedAt) >= todayUTC) {
    console.log("GET MINING HISTORY PASS WITH CACHE");
    return res.status(200).json(cachedData.data);
  }

  // fetch mining data
  const dateMin = start
    ? convertDateToTimestamptzFormat(new Date(start.toString()))
    : undefined;
  const dateMax = end
    ? convertDateToTimestamptzFormat(new Date(end.toString()))
    : undefined;

  console.log(
    "GET MINING HISTORY ",
    farm,
    dateMin,
    dateMax,
    first ? "first : " + first : ""
  );
  try {
    const farmSlug = farm.toString();
    const supabaseClient = getSupabaseClient();

    const { data: miningData, error: miningError } = await fetchMiningData(
      supabaseClient,
      farmSlug,
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
    // Cache the response for future use
    const newCachedData: CachedData = {
      upatedAt: convertDateToKey(new Date()),
      data: miningData,
    };
    cache.set(cacheKey, newCachedData);
    console.log(
      "GET MINING HISTORY PASS NO CACHE",
      JSON.stringify(newCachedData.upatedAt)
    );

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
  dateMin: string | undefined,
  dateMax: string | undefined,
  first?: number
): Promise<{
  data: Database["public"]["Tables"]["mining"]["Row"][];
  error: unknown;
}> {
  if (dateMin && dateMax) {
    const { data, error } = await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .gte("day", dateMin)
      .lt("day", dateMax);
    return {
      data: data as Database["public"]["Tables"]["mining"]["Row"][],
      error: error,
    };
  } else if (dateMin) {
    const { data, error } = await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .gte("day", dateMin);
    return {
      data: data as Database["public"]["Tables"]["mining"]["Row"][],
      error: error,
    };
  } else if (dateMax) {
    const { data, error } = await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .lt("day", dateMax);
    return {
      data: data as Database["public"]["Tables"]["mining"]["Row"][],
      error: error,
    };
  } else if (first) {
    const { data, error } = await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm)
      .order("day", { ascending: false })
      .limit(first);
    return {
      data: data as Database["public"]["Tables"]["mining"]["Row"][],
      error: error,
    };
  } else {
    const { data, error } = await supabase
      .from("mining")
      .select()
      .eq("farmSlug", farm);
    return {
      data: data as Database["public"]["Tables"]["mining"]["Row"][],
      error: error,
    };
  }
}

async function insertPoolDataInMiningTable(
  supabase: SupabaseClient,
  username: string,
  password: string,
  farm: string,
  data: DayPoolData[],
  retry: number = 0
) {
  if (data.length === 0) {
    console.warn(farm + ": No data to insert in mining table");
    return;
  }

  let error;

  const row: Database["public"]["Tables"]["mining"]["Insert"][] = data.map(
    (d) => {
      //console.log("Inserting mining data", d.date);
      return {
        farmSlug: farm,
        hashrateTHs: d.hashrateTHs,
        mined: d.revenue,
        uptime: d.efficiency,
        siteSlug: d.site,
        day: d.date,
      };
    }
  );

  //const username = process.env.SUPABASE_ADMIN_USER ?? "";
  //const password = process.env.SUPABASE_ADMIN_PASSWORD ?? "";
  console.log("UPDATING mining history : sign in");
  try {
    const { data: signData, error: signError } = await signIn(
      supabase,
      username,
      password
    );
    console.log(
      "UPDATING mining history : sign in result",
      JSON.stringify({ signData, signError })
    );
    if (signError) {
      throw new Error("Error while signing in. " + signError);
    }
    const token = signData.session?.access_token;

    if (!token) {
      console.error("No access token found");
      await signOut(supabase);
      throw new Error("No access token found");
    }
  } catch (e) {
    console.error("Error while signing in. " + e);
    throw new Error("Error while signing in. " + e);
  }

  try {
    console.log("UPDATING mining history : inserting data");
    const {
      error: errorInsert,
      count,
      status,
      statusText,
      data: dataReturn,
    } = await supabase.from("mining").insert(row).select();
    console.log(
      "UPDATING mining history result:",
      JSON.stringify({
        count,
        status,
        statusText,
        dataReturn,
      })
    );
    error = errorInsert;
  } catch (e) {
    console.error("Error while inserting mining data. " + e);
    error = e;
  }

  console.log("UPDATING mining history : sign out");
  //await signOut(supabase);

  if (error) {
    console.error(
      "Retry:" +
        retry +
        ". Error while inserting mining data. " +
        JSON.stringify(row),
      error
    );

    if (retry < RETRY_MAX) {
      //wait 100ms before retry
      await new Promise((resolve) => setTimeout(resolve, 100));
      await insertPoolDataInMiningTable(
        supabase,
        username,
        password,
        farm,
        data,
        retry + 1
      );
    } else {
      throw new Error(
        "Error while inserting mining data " +
          JSON.stringify(row) +
          ". " +
          error
      );
    }
  }
}

async function insertPoolDataInMiningTable2(
  username: string,
  password: string,
  farm: string,
  data: DayPoolData[]
): Promise<{ error?: unknown }> {
  const authUrl =
    "https://zlczywhctfaosxqtjwee.supabase.co/auth/v1/token?grant_type=password";
  const authBody = {
    email: username,
    password: password,
  };

  const apikey = process.env.SUPABASE_API_KEY ?? "";

  try {
    const authResponse = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apikey,
      },
      body: JSON.stringify(authBody),
    });

    if (!authResponse.ok) {
      throw new Error(`Authentication failed: ${authResponse.statusText}`);
    }

    const authData = await authResponse.json();
    const token = authData.access_token;

    if (!token) {
      throw new Error("No access token found");
    }

    console.log("Access token:", token);

    const url = "https://zlczywhctfaosxqtjwee.supabase.co/rest/v1/mining";

    const rows: Database["public"]["Tables"]["mining"]["Insert"][] = data.map(
      (d) => {
        //console.log("Inserting mining data", d.date);
        return {
          farmSlug: farm,
          hashrateTHs: d.hashrateTHs,
          mined: d.revenue,
          uptime: d.efficiency,
          siteSlug: d.site,
          day: d.date,
        };
      }
    );

    console.log("Inserting data:", JSON.stringify(rows, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: apikey,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(rows),
    });

    console.log("Response:", response.ok, response.statusText);
    if (!response.ok) {
      throw new Error(`Error while posting data: ${response.statusText}`);
    }

    //const responseData = await response.json();
    //console.log("Data posted successfully:", responseData);
  } catch (error) {
    console.error("Error:", error);
    return { error: error };
  }

  return {};
}
