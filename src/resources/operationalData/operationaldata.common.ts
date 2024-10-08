import { Database } from "@/types/supabase";
import { fetchFinancialStatements } from "@/resources/financialstatements/financialstatement.common";
import { getFinancialStatementsPeriod } from "@/tools/financialstatements/financialstatement.commons";
import { convertDateToTimestamptzFormat } from "@/tools/date";
import { fetchMiningHistory, MiningHistoryResponse } from "./mininghistory";
import { MiningData } from "@/types/MiningHistory";

export async function fetchOperationalData(
  farm: string,
  site: string | undefined,
  start_param: string | undefined,
  end_param: string | undefined
): Promise<{
  financialStatementsData: Database["public"]["Tables"]["financialStatements"]["Row"][];
  miningHistoryData: Database["public"]["Tables"]["mining"]["Row"][];
  message: string;
  status: number;
  ok: boolean;
}> {
  // Fetch financial statements data
  const financialStatementsApiResponse: Response =
    await fetchFinancialStatements(farm, site, start_param, end_param);
  if (!financialStatementsApiResponse.ok) {
    return {
      financialStatementsData: [],
      miningHistoryData: [],

      status: financialStatementsApiResponse.status,
      ok: false,
      message:
        "Error while fetching financial statements of " +
        site +
        "! " +
        financialStatementsApiResponse.statusText,
    };
  }
  const financialStatementsData: Database["public"]["Tables"]["financialStatements"]["Row"][] =
    await financialStatementsApiResponse.json();

  console.log("financialStatementsData", financialStatementsData.length);

  const { start: startStatement, end: endstatement } =
    getFinancialStatementsPeriod(financialStatementsData);

  // Get the start date for mining history
  let startMining: Date | undefined = undefined;
  if (start_param && startStatement) {
    startMining =
      new Date(start_param) < startStatement
        ? new Date(start_param)
        : startStatement;
  } else if (start_param) {
    startMining = new Date(start_param);
  }

  let endMining: Date | undefined = undefined;
  if (end_param && endstatement) {
    endMining =
      endstatement < new Date(end_param) ? new Date(end_param) : endstatement;
  } else if (end_param) {
    endMining = new Date(end_param);
  }

  const startMiningTimestampz = startMining
    ? convertDateToTimestamptzFormat(startMining)
    : undefined;
  const endMiningTimestampz = endMining
    ? convertDateToTimestamptzFormat(endMining)
    : undefined;

  console.log("startMining", startMiningTimestampz);
  console.log("endMining", endMiningTimestampz);

  // Fetch mining history data
  const miningHistoryApiresponse: MiningHistoryResponse =
    await fetchMiningHistory(
      farm,
      site,
      startMiningTimestampz,
      endMiningTimestampz
    );
  if (!miningHistoryApiresponse.ok) {
    return {
      financialStatementsData: [],
      miningHistoryData: [],

      status: miningHistoryApiresponse.status,
      ok: false,
      message:
        "Error while fetchin mining history of site " +
        site +
        "! " +
        miningHistoryApiresponse.statusText,
    };
  }

  const miningHistoryData: MiningData[] = miningHistoryApiresponse.data;

  return {
    financialStatementsData,
    miningHistoryData,
    status: 200,
    ok: true,
    message: "Success",
  };
}
