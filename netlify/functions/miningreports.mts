/* eslint-disable import/no-anonymous-default-export */
import type { Context } from "@netlify/functions";
import { Farm, Site } from "../../src/types/supabase.extend";
import { DailyMiningReport } from "../../src/types/MiningReport";
import { Database } from "../../src/types/supabase";
import { getSiteDailyMiningReports } from "../../src/tools/site";
import { getFarmDailyMiningReports } from "../../src/tools/farm";
import {
  GET_GATEWAY_SITE,
  GET_GATEWAY_MINING_HISTORY,
  GET_GATEWAY_FINANCIAL_STATEMENTS,
  GET_GATEWAY_FARM,
} from "../../src/constants/apis";
import { getFinancialStatementsPeriod } from "../../src/tools/financialstatements";
import {
  convertDateToTimestamptzFormat,
  convertToUTCStartOfDay,
} from "../../src/tools/date";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const farm = url.searchParams.get("farm") || "undefined";
  const site = url.searchParams.get("site") || "undefined";
  const start = url.searchParams.get("start") || undefined;
  const end = url.searchParams.get("end") || undefined;
  const btc_input = url.searchParams.get("btc") || undefined;

  const todayUTC = convertToUTCStartOfDay(new Date());

  if (farm === "undefined" && site === "undefined") {
    return new Response("Please provide a farm or a site", { status: 400 });
  }

  if (btc_input === undefined) {
    return new Response("Please provide a btc price", { status: 400 });
  }

  if (btc_input && isNaN(Number(btc_input))) {
    return new Response("Invalid btc price", { status: 400 });
  }

  if (start && !Date.parse(start)) {
    return new Response("Invalid start date", { status: 400 });
  }
  if (end && !Date.parse(end)) {
    return new Response("Invalid end date", { status: 400 });
  }

  if (start && end && new Date(start) > new Date(end)) {
    return new Response("Start date is greater than end date", { status: 400 });
  }
  if (start && end && new Date(start) > todayUTC) {
    return new Response("Start date is greater than current date", {
      status: 400,
    });
  }

  if (end && new Date(end) > todayUTC) {
    return new Response("End date is greater than current date", {
      status: 400,
    });
  }

  const btc = Number(btc_input);

  try {
    if (site === "undefined") {
      // Farm report
      console.log("api farm", farm);
      const response = await fetchFarmDailyReport(farm, btc, start, end);
      if (!response.ok) {
        return new Response(response.message, {
          status: response.status,
        });
      }

      console.log("api farm response", JSON.stringify(response.report));

      return new Response(JSON.stringify(response.report), {
        headers: { "content-type": "application/json" },
      });
    } else {
      // Site report
      const response = await fetchSiteDailyReport(farm, site, btc, start, end);

      if (!response.ok) {
        return new Response(response.message, { status: response.status });
      }

      return new Response(JSON.stringify(response.report), {
        headers: { "content-type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error api site " + error);
    return new Response("Failed to compute mining report! " + error, {
      status: 500,
    });
  }
};

async function fetchSiteDailyReport(
  farm: string,
  site: string,
  btc: number,
  start: string | undefined,
  end: string | undefined
): Promise<{
  report: DailyMiningReport[];
  message: string;
  status: number;
  ok: boolean;
}> {
  const operationalData = await fetchSiteOperationalData(
    farm,
    site,
    start,
    end
  );

  if (!operationalData.ok) {
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
    start ? new Date(start) : undefined,
    end ? new Date(end) : undefined
  );
  return {
    report: reports,
    status: 200,
    ok: true,
    message: "Success",
  };
}

async function fetchFarmDailyReport(
  farm: string,
  btc: number,
  start: string | undefined,
  end: string | undefined
): Promise<{
  report: DailyMiningReport[];
  message: string;
  status: number;
  ok: boolean;
}> {
  const operationalData = await fetchFarmOperationalData(farm, start, end);

  if (!operationalData.ok) {
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
    start ? new Date(start) : undefined,
    end ? new Date(end) : undefined
  );
  return {
    report: reports,
    status: 200,
    ok: true,
    message: "Success",
  };
}

async function fetchFarmOperationalData(
  farm: string,
  start: string | undefined,
  end: string | undefined
): Promise<{
  financialStatementsData: Database["public"]["Tables"]["financialStatements"]["Row"][];
  miningHistoryData: Database["public"]["Tables"]["mining"]["Row"][];
  farmData: Farm;
  message: string;
  status: number;
  ok: boolean;
}> {
  const farmApiResponse: Response = await fetchFarm(farm);

  if (!farmApiResponse.ok) {
    return {
      financialStatementsData: [],
      miningHistoryData: [],
      farmData: {},
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
      farmData: {},
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

async function fetchSiteOperationalData(
  farm: string,
  site: string,
  start: string | undefined,
  end: string | undefined
): Promise<{
  financialStatementsData: Database["public"]["Tables"]["financialStatements"]["Row"][];
  miningHistoryData: Database["public"]["Tables"]["mining"]["Row"][];
  siteData: Site;
  message: string;
  status: number;
  ok: boolean;
}> {
  const siteApiResponse: Response = await fetchSite(farm, site);

  if (!siteApiResponse.ok) {
    return {
      financialStatementsData: [],
      miningHistoryData: [],
      siteData: {},
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
      siteData: {},
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

async function fetchOperationalData(
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
    await fetchFinancialStatements(farm, site);
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

  const { start: startStatement, end: endstatement } =
    getFinancialStatementsPeriod(financialStatementsData);

  const startMining =
    start && startStatement > new Date(start)
      ? new Date(start)
      : startStatement;
  const endMining =
    end && endstatement < new Date(end) ? new Date(end) : endstatement;

  console.log("startMining", startMining);
  console.log("endMining", endMining);

  // Fetch mining history data
  const miningHistoryApiresponse: Response = await fetchMiningHistory(
    farm,
    site,
    convertDateToTimestamptzFormat(startMining),
    convertDateToTimestamptzFormat(endMining)
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

async function fetchFarm(farm: string): Promise<any> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_FARM.url === "function"
      ? GET_GATEWAY_FARM.url(farm, "")
      : GET_GATEWAY_FARM.url;

  const apiurl = gatewayBaseUrl + path;

  console.log(apiurl.toString());

  try {
    return await fetch(apiurl.toString(), {
      method: "GET",
      headers: GET_GATEWAY_FARM.headers,
    });
  } catch (error) {
    console.error("Error api financial statements " + error);
    throw new Error("Error api financial statements " + error);
  }
}

async function fetchSite(farm: string, site: string): Promise<any> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_SITE.url === "function"
      ? GET_GATEWAY_SITE.url(farm, site)
      : GET_GATEWAY_SITE.url;

  const apiurl = gatewayBaseUrl + path;

  console.log(apiurl.toString());

  try {
    return await fetch(apiurl.toString(), {
      method: GET_GATEWAY_SITE.method,
      headers: GET_GATEWAY_SITE.headers,
    });
  } catch (error) {
    console.error("Error api financial statements " + error);
    throw new Error("Error api financial statements " + error);
  }
}

async function fetchMiningHistory(
  farm: string,
  site: string | undefined = undefined,
  start: string | undefined = undefined,
  end: string | undefined = undefined
): Promise<any> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_MINING_HISTORY.url === "function"
      ? GET_GATEWAY_MINING_HISTORY.url(farm, site)
      : GET_GATEWAY_MINING_HISTORY.url;

  const apiurl = gatewayBaseUrl + path;

  const url = new URL(apiurl);

  // Ajouter les paramètres de requête
  if (start) {
    url.searchParams.append("start", start);
  }
  if (end) {
    url.searchParams.append("end", end);
  }

  console.log(url.toString());

  try {
    return await fetch(url.toString(), {
      method: GET_GATEWAY_MINING_HISTORY.method,
      headers: GET_GATEWAY_MINING_HISTORY.headers,
    });
  } catch (error) {
    console.error("Error api mining history " + error);
    throw new Error("Error api mining history " + error);
  }
}

async function fetchFinancialStatements(
  farm: string,
  site?: string,
  start: string | undefined = undefined,
  end: string | undefined = undefined
): Promise<any> {
  const gatewayBaseUrl = process.env.GATEWAY_URL ?? "";
  const path =
    typeof GET_GATEWAY_FINANCIAL_STATEMENTS.url === "function"
      ? GET_GATEWAY_FINANCIAL_STATEMENTS.url(farm, site)
      : GET_GATEWAY_FINANCIAL_STATEMENTS.url;

  const apiurl = gatewayBaseUrl + path;

  const url = new URL(apiurl);

  // Ajouter les paramètres de requête
  if (start) {
    url.searchParams.append("start", start);
  }
  if (end) {
    url.searchParams.append("end", end);
  }

  console.log(url.toString());

  try {
    return await fetch(url.toString(), {
      method: GET_GATEWAY_FINANCIAL_STATEMENTS.method,
      headers: GET_GATEWAY_FINANCIAL_STATEMENTS.headers,
    });
  } catch (error) {
    console.error("Error api financial statements " + error);
    throw new Error("Error api financial statements " + error);
  }
}
