import { Database } from "@/types/supabase";
import { Farm } from "@/types/supabase.extend";
import { fetchFarm } from "../farm";
import { fetchOperationalData } from "./operationaldata.common";
import { FinancialSource } from "@/types/MiningReport";
import { filterSiteMiningHistoryDataOutOfRange } from "./site";

export async function fetchFarmOperationalData(
  farm: string,
  start_param: string | undefined,
  end_param: string | undefined,
  financial_sources?: FinancialSource[]
): Promise<{
  financialStatementsData: Database["public"]["Tables"]["financialStatements"]["Row"][];
  miningHistoryData: Database["public"]["Tables"]["mining"]["Row"][];
  farmData: Farm | undefined;
  message: string;
  status: number;
  ok: boolean;
}> {
  const farmApiResponse = await fetchFarm(farm);

  if (!farmApiResponse.ok || farmApiResponse.farmData === undefined) {
    return {
      financialStatementsData: [],
      miningHistoryData: [],
      farmData: undefined,
      status: farmApiResponse.status,
      ok: false,
      message:
        "Error while fetching farm " + farm + "! " + farmApiResponse.statusText,
    };
  }
  const farmData: Farm = farmApiResponse.farmData;

  const operationalData = await fetchOperationalData(
    farm,
    undefined,
    start_param,
    end_param,
    financial_sources
  );
  if (!operationalData.ok) {
    return {
      financialStatementsData: [],
      miningHistoryData: [],
      farmData: undefined,
      status: operationalData.status,
      ok: false,
      message: operationalData.message,
    };
  }

  return {
    financialStatementsData: operationalData.financialStatementsData,
    miningHistoryData: filterFarmMiningHistoryDataOutOfRange(
      operationalData.miningHistoryData,
      farmData
    ),
    farmData,
    status: 200,
    ok: true,
    message: "Success",
  };
}

function filterFarmMiningHistoryDataOutOfRange(
  miningHistoryData: Database["public"]["Tables"]["mining"]["Row"][],
  farm: Farm
): Database["public"]["Tables"]["mining"]["Row"][] {
  const farmData: Database["public"]["Tables"]["mining"]["Row"][] = [];
  farm.sites.forEach((site) => {
    const siteMiningHistoryDataFiltered = filterSiteMiningHistoryDataOutOfRange(
      miningHistoryData,
      site
    );
    farmData.push(...siteMiningHistoryDataFiltered);
  });

  return farmData;
}
