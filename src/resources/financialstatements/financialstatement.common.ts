import { GET_GATEWAY_FINANCIAL_STATEMENTS } from "@/constants/apis";

export async function fetchFinancialStatements(
  farm: string,
  site?: string,
  start: string | undefined = undefined,
  end: string | undefined = undefined
): Promise<any> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_FINANCIAL_STATEMENTS.url === "function"
      ? GET_GATEWAY_FINANCIAL_STATEMENTS.url(farm, site)
      : GET_GATEWAY_FINANCIAL_STATEMENTS.url;

  const apiurl = gatewayBaseUrl + path;

  const url = new URL(apiurl);

  // Ajouter les paramètres de requête
  if (start) {
    url.searchParams.append("start", start);
  }
  if (end) {
    url.searchParams.append("end", end);
  }

  console.log("FETCH FINANCIAL STATEMENTS", url.toString());

  try {
    return await fetch(url.toString(), {
      method: GET_GATEWAY_FINANCIAL_STATEMENTS.method,
      headers: GET_GATEWAY_FINANCIAL_STATEMENTS.headers,
    });
  } catch (error) {
    console.error("Error api financial statements " + error);
    throw new Error("Error api financial statements " + error);
  }
}
