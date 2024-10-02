import { GET_GATEWAY_MINING_HISTORY } from "@/constants/apis";

export async function fetchMiningHistory(
  farm: string,
  site: string | undefined = undefined,
  start: string | undefined = undefined,
  end: string | undefined = undefined
): Promise<any> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_MINING_HISTORY.url === "function"
      ? GET_GATEWAY_MINING_HISTORY.url(farm, site)
      : GET_GATEWAY_MINING_HISTORY.url;

  const apiurl = gatewayBaseUrl + path;

  const url = new URL(apiurl);

  // Ajouter les paramètres de requête
  if (start) {
    url.searchParams.append("start", start);
  }
  if (end) {
    url.searchParams.append("end", end);
  }

  console.log(url.toString());

  try {
    return await fetch(url.toString(), {
      method: GET_GATEWAY_MINING_HISTORY.method,
      headers: GET_GATEWAY_MINING_HISTORY.headers,
    });
  } catch (error) {
    console.error("Error api mining history " + error);
    throw new Error("Error api mining history " + error);
  }
}
