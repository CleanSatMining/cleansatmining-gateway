import { GET_GATEWAY_MINING_HISTORY } from "@/constants/apis";
import { MiningData } from "@/types/MiningHistory";

export interface MiningHistoryResponse {
  ok: boolean;
  status: number;
  statusText: string;
  data: MiningData[];
}

export async function fetchMiningHistory(
  farm: string,
  site: string | undefined = undefined,
  start: string | undefined = undefined,
  end: string | undefined = undefined,
  first: number | undefined = undefined
): Promise<MiningHistoryResponse> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_MINING_HISTORY.url === "function"
      ? GET_GATEWAY_MINING_HISTORY.url(farm, site)
      : GET_GATEWAY_MINING_HISTORY.url;

  const apiurl = gatewayBaseUrl + path;

  console.log("CALL Mining history api", apiurl);

  const url = new URL(apiurl);

  // Ajouter les paramètres de requête
  if (start) {
    url.searchParams.append("start", start);
  }
  if (end) {
    url.searchParams.append("end", end);
  }
  if (first) {
    url.searchParams.append("first", first.toString());
  }

  console.log(url.toString());

  try {
    const response = await fetch(url.toString(), {
      method: GET_GATEWAY_MINING_HISTORY.method,
      headers: GET_GATEWAY_MINING_HISTORY.headers,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        data: [],
      };
    }
    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      data: data,
    };
  } catch (error) {
    console.error("Error api mining history " + error);
    throw new Error("Error api mining history " + error);
  }
}
