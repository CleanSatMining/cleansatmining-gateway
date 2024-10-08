import { GET_MICROSERVICE_MINING_REPORT } from "@/constants/apis";
import { MicroServiceMiningReportResponse } from "@/types/Api";

export async function fetchMiningReport(
  farm: string,
  site: string | undefined = undefined,
  btc: number,
  start: string | undefined = undefined,
  end: string | undefined = undefined
): Promise<{
  report: MicroServiceMiningReportResponse | undefined;
  message: string;
  status: number;
  ok: boolean;
}> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_MICROSERVICE_MINING_REPORT.url === "function"
      ? GET_MICROSERVICE_MINING_REPORT.url(farm, site, btc)
      : GET_MICROSERVICE_MINING_REPORT.url;

  const microserviceUrl = gatewayBaseUrl + path;

  const url = new URL(microserviceUrl);

  // Ajouter les paramètres de requête
  if (start) {
    url.searchParams.append("start", start);
  }
  if (end) {
    url.searchParams.append("end", end);
  }

  console.log(url.toString());

  try {
    const response = await fetch(url.toString(), {
      method: GET_MICROSERVICE_MINING_REPORT.method,
      headers: GET_MICROSERVICE_MINING_REPORT.headers,
    });

    if (!response.ok) {
      return {
        report: undefined,
        status: response.status,
        ok: false,
        message:
          "Error fetching microservice mining report " + response.statusText,
      };
    }

    const data: MicroServiceMiningReportResponse = await response.json();

    return {
      report: data,
      status: response.status,
      ok: response.ok,
      message: "Success",
    };
  } catch (error) {
    console.error("Error fetch microservice mining report " + error);
    throw new Error("Error fetch microservice mining report " + error);
  }
}
