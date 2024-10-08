import { GET_GATEWAY_FARM, GET_GATEWAY_FARMS } from "@/constants/apis";
import { Farm } from "@/types/supabase.extend";
import { DayPoolData } from "@/types/Pool";
import { Database } from "@/types/supabase"; // Add this import statement

export interface FarmApiResponse {
  ok: boolean;
  status: number;
  statusText: string;
  farmData?: Farm;
}

export interface FarmsApiResponse {
  ok: boolean;
  status: number;
  statusText: string;
  farmsData?: Database["public"]["Tables"]["farms"]["Row"][];
}

export async function fetchFarm(farm: string): Promise<FarmApiResponse> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_FARM.url === "function"
      ? GET_GATEWAY_FARM.url(farm, "")
      : GET_GATEWAY_FARM.url;

  const apiurl = gatewayBaseUrl + path;

  console.log(apiurl.toString());

  try {
    const response = await fetch(apiurl.toString(), {
      method: "GET",
      headers: GET_GATEWAY_FARM.headers,
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
      };
    }
    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      farmData: data,
    };
  } catch (error) {
    console.error("Error api financial statements " + error);
    throw new Error("Error api financial statements " + error);
  }
}

export async function fetchFarms(): Promise<FarmsApiResponse> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path = GET_GATEWAY_FARMS.url;

  const apiurl = gatewayBaseUrl + path;

  console.log(apiurl.toString());

  try {
    const response = await fetch(apiurl.toString(), {
      method: "GET",
      headers: GET_GATEWAY_FARM.headers,
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
      };
    }
    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      farmsData: data,
    };
  } catch (error) {
    console.error("Error api financial statements " + error);
    throw new Error("Error api financial statements " + error);
  }
}
