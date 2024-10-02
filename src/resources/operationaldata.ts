import { Database } from "@/types/supabase";
import { fetchFinancialStatements } from "@/resources/financialstatement";
import { getFinancialStatementsPeriod } from "@/tools/financialstatements";
import { convertDateToTimestamptzFormat } from "@/tools/date";
import { fetchMiningHistory } from "./mininghistory";
import { Farm, Site } from "@/types/supabase.extend";
import { fetchFarm } from "./farm";
import { fetchSite } from "./site";

export async function fetchOperationalData(
  farm: string,
  site: string | undefined,
  start: string | undefined,
  end: string | undefined
): Promise<{
  financialStatementsData: Database["public"]["Tables"]["financialStatements"]["Row"][];
  miningHistoryData: Database["public"]["Tables"]["mining"]["Row"][];
  message: string;
  status: number;
  ok: boolean;
}> {
  // Fetch financial statements data
  const financialStatementsApiResponse: Response =
    await fetchFinancialStatements(farm, site, start, end);
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
  if (start && startStatement) {
    startMining =
      new Date(start) < startStatement ? new Date(start) : startStatement;
  } else if (start) {
    startMining = new Date(start);
  } else if (startStatement) {
    startMining = startStatement;
  }

  let endMining: Date | undefined = undefined;
  if (end && endstatement) {
    endMining = endstatement < new Date(end) ? new Date(end) : endstatement;
  } else if (end) {
    endMining = new Date(end);
  } else if (endstatement) {
    endMining = endstatement;
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
  const miningHistoryApiresponse: Response = await fetchMiningHistory(
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

  const miningHistoryData: Database["public"]["Tables"]["mining"]["Row"][] =
    await miningHistoryApiresponse.json();

  return {
    financialStatementsData,
    miningHistoryData,
    status: 200,
    ok: true,
    message: "Success",
  };
}

export async function fetchFarmOperationalData(
  farm: string,
  start: string | undefined,
  end: string | undefined
): Promise<{
  financialStatementsData: Database["public"]["Tables"]["financialStatements"]["Row"][];
  miningHistoryData: Database["public"]["Tables"]["mining"]["Row"][];
  farmData: Farm | undefined;
  message: string;
  status: number;
  ok: boolean;
}> {
  const farmApiResponse: Response = await fetchFarm(farm);

  if (!farmApiResponse.ok) {
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
  const farmData: Farm = await farmApiResponse.json();

  const operationalData = await fetchOperationalData(
    farm,
    undefined,
    start,
    end
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
  const siteApiResponse: Response = await fetchSite(farm, site);

  if (!siteApiResponse.ok) {
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
  const siteData: Site = await siteApiResponse.json();

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
