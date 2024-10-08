import { Database } from "@/types/supabase";
import { Site } from "@/types/supabase.extend";
import { fetchSite } from "../site";
import { fetchOperationalData } from "./operationaldata.common";

export async function fetchSiteOperationalData(
  farm: string,
  site: string,
  start: string | undefined,
  end: string | undefined
): Promise<{
  financialStatementsData: Database["public"]["Tables"]["financialStatements"]["Row"][];
  miningHistoryData: Database["public"]["Tables"]["mining"]["Row"][];
  siteData: Site | undefined;
  message: string;
  status: number;
  ok: boolean;
}> {
  const siteApiResponse = await fetchSite(farm, site);

  if (!siteApiResponse.ok || siteApiResponse.siteData === undefined) {
    return {
      financialStatementsData: [],
      miningHistoryData: [],
      siteData: undefined,
      status: siteApiResponse.status,
      ok: false,
      message:
        "Error while fetching site " +
        site +
        " of farm " +
        farm +
        "! " +
        siteApiResponse.statusText,
    };
  }
  const siteData: Site = siteApiResponse.siteData;

  const operationalData = await fetchOperationalData(farm, site, start, end);
  if (!operationalData.ok) {
    return {
      financialStatementsData: [],
      miningHistoryData: [],
      siteData: undefined,
      status: operationalData.status,
      ok: false,
      message: operationalData.message,
    };
  }

  return {
    financialStatementsData: operationalData.financialStatementsData,
    miningHistoryData: operationalData.miningHistoryData,
    siteData,
    status: 200,
    ok: true,
    message: "Success",
  };
}
