import { GET_GATEWAY_SITE } from "@/constants/apis";
import { Site } from "@/types/supabase.extend";

export interface SiteApiResponse {
  ok: boolean;
  status: number;
  statusText: string;
  siteData?: Site;
}

export async function fetchSite(
  farm: string,
  site: string
): Promise<SiteApiResponse> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_SITE.url === "function"
      ? GET_GATEWAY_SITE.url(farm, site)
      : GET_GATEWAY_SITE.url;

  const apiurl = gatewayBaseUrl + path;

  console.log("FETCH SITE: " + apiurl.toString());

  try {
    const response = await fetch(apiurl.toString(), {
      method: GET_GATEWAY_SITE.method,
      headers: GET_GATEWAY_SITE.headers,
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
      siteData: data,
    };
  } catch (error) {
    console.error("Error api financial statements " + error);
    throw new Error("Error api financial statements " + error);
  }
}
