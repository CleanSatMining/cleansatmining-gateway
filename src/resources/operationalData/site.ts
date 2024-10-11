import { Database } from "@/types/supabase";
import { Site } from "@/types/supabase.extend";
import { fetchSite } from "../site";
import { fetchOperationalData } from "./operationaldata.common";
import { FinancialSource } from "@/types/MiningReport";

export async function fetchSiteOperationalData(
  farm: string,
  site: string,
  start: string | undefined,
  end: string | undefined,
  financial_sources?: FinancialSource[]
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

  const operationalData = await fetchOperationalData(
    farm,
    site,
    start,
    end,
    financial_sources
  );
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
    miningHistoryData: filterSiteMiningHistoryDataOutOfRange(
      operationalData.miningHistoryData,
      siteData
    ),
    siteData,
    status: 200,
    ok: true,
    message: "Success",
  };
}

export function filterSiteMiningHistoryDataOutOfRange(
  miningHistoryData: Database["public"]["Tables"]["mining"]["Row"][],
  site: Site
): Database["public"]["Tables"]["mining"]["Row"][] {
  const start = site.started_at ? new Date(site.started_at) : undefined;
  const end = site.closed_at ? new Date(site.closed_at) : undefined;

  return miningHistoryData.filter((row) => {
    if (row.siteSlug !== site.slug) {
      // do not filter out rows that are not from the site
      return false;
    }
    const date = new Date(row.day);
    if (start && date < start) {
      return false;
    }
    if (end && end <= date) {
      return false;
    }
    return true;
  });
}
