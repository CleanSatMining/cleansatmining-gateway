import { Database } from "@/types/supabase";
import { fetchFinancialStatements } from "@/resources/financialstatements/financialstatement.common";
import { getFinancialStatementsPeriod } from "@/tools/financialstatements/financialstatement.commons";
import { convertDateToTimestamptzFormat } from "@/tools/date";
import { fetchMiningHistory, MiningHistoryResponse } from "./mininghistory";
import { MiningData } from "@/types/MiningHistory";
import { FinancialSource } from "@/types/MiningReport";

export async function fetchOperationalData(
  farm: string,
  site: string | undefined,
  start_param: string | undefined,
  end_param: string | undefined,
  financial_sources: FinancialSource[] = [
    FinancialSource.POOL,
    FinancialSource.STATEMENT,
  ]
): Promise<{
  financialStatementsData: Database["public"]["Tables"]["financialStatements"]["Row"][];
  miningHistoryData: Database["public"]["Tables"]["mining"]["Row"][];
  message: string;
  status: number;
  ok: boolean;
}> {
  let financialStatementsData: Database["public"]["Tables"]["financialStatements"]["Row"][] =
    [];
  if (financial_sources.includes(FinancialSource.STATEMENT)) {
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
    financialStatementsData = await financialStatementsApiResponse.json();
  }

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

  let miningHistoryData: MiningData[] = [];
  if (financial_sources.includes(FinancialSource.POOL)) {
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

    miningHistoryData = miningHistoryApiresponse.data;
  }

  return {
    financialStatementsData,
    miningHistoryData,
    status: 200,
    ok: true,
    message: "Success",
  };
}
