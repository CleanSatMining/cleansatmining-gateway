import { fetchSite } from "../site";
import { PoolDataResponse, fetchPoolData } from "./pools.common";

export async function fetchSitePoolData(
  _farm: string,
  _site: string,
  first?: number,
  start?: string,
  end?: string
): Promise<PoolDataResponse> {
  // fetch site
  const siteResponse = await fetchSite(_farm, _site);

  if (!siteResponse.ok || siteResponse.siteData === undefined) {
    return {
      ok: false,
      status: siteResponse.status,
      statusText: siteResponse.statusText,
    };
  }
  const site = siteResponse.siteData;

  //fatch pool data
  return await fetchPoolData(site, first);
}
