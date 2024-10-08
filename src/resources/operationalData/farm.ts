import { Database } from "@/types/supabase";
import { Farm } from "@/types/supabase.extend";
import { fetchFarm } from "../farm";
import { fetchOperationalData } from "./operationaldata.common";

export async function fetchFarmOperationalData(
  farm: string,
  start_param: string | undefined,
  end_param: string | undefined
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
    end_param
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
    miningHistoryData: operationalData.miningHistoryData,
    farmData,
    status: 200,
    ok: true,
    message: "Success",
  };
}
