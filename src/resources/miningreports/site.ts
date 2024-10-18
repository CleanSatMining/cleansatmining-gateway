import { getSiteDailyMiningReports } from "@/tools/miningreports/site";
import { DailyMiningReport, FinancialSource } from "@/types/MiningReport";
import { fetchSiteOperationalData } from "../operationalData/site";

export async function fetchSiteDailyMiningReport(
  farm: string,
  site: string,
  btc: number,
  start_param: string | undefined,
  end_param: string | undefined,
  depreciationDuration: number,
  financial_sources?: FinancialSource[]
): Promise<{
  report: DailyMiningReport[];
  message: string;
  status: number;
  ok: boolean;
}> {
  const operationalData = await fetchSiteOperationalData(
    farm,
    site,
    start_param,
    end_param,
    financial_sources
  );

  if (!operationalData.ok || operationalData.siteData === undefined) {
    return {
      report: [],
      status: operationalData.status,
      ok: false,
      message: operationalData.message,
    };
  }

  const reports = getSiteDailyMiningReports(
    operationalData.financialStatementsData,
    operationalData.miningHistoryData,
    operationalData.siteData,
    btc,
    start_param ? new Date(start_param) : undefined,
    end_param ? new Date(end_param) : undefined,
    depreciationDuration
  );
  return {
    report: reports,
    status: 200,
    ok: true,
    message: "Success",
  };
}
