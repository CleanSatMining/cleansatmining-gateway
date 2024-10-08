import { getFarmDailyMiningReports } from "@/tools/miningreports/farm";
import { DailyMiningReport } from "@/types/MiningReport";
import { fetchFarmOperationalData } from "../operationalData/farm";

export async function fetchFarmDailyReport(
  farm: string,
  btc: number,
  start_param: string | undefined,
  end_param: string | undefined
): Promise<{
  report: DailyMiningReport[];
  message: string;
  status: number;
  ok: boolean;
}> {
  const operationalData = await fetchFarmOperationalData(
    farm,
    start_param,
    end_param
  );

  if (!operationalData.ok || operationalData.farmData === undefined) {
    return {
      report: [],
      status: operationalData.status,
      ok: false,
      message: operationalData.message,
    };
  }

  const reports = getFarmDailyMiningReports(
    operationalData.financialStatementsData,
    operationalData.miningHistoryData,
    operationalData.farmData,
    btc,
    start_param ? new Date(start_param) : undefined,
    end_param ? new Date(end_param) : undefined
  );
  return {
    report: reports,
    status: 200,
    ok: true,
    message: "Success",
  };
}
