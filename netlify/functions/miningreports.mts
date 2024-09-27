/* eslint-disable import/no-anonymous-default-export */
import type { Context } from "@netlify/functions";
import { Site } from "../../src/types/supabase.extend";
import { Database } from "../../src/types/supabase";
import { getSiteDailyMiningReports } from "../../src/tools/miningreport";
import {
  GET_GATEWAY_SITE,
  GET_GATEWAY_MINING_HISTORY,
  GET_GATEWAY_FINANCIAL_STATEMENTS,
} from "../../src/constants/apis";
import { getFinancialStatementsPeriod } from "../../src/tools/financialstatements";
import {
  convertDateToTimestamptzFormat,
  convertToUTCStartOfDay,
  getYesterdayDate,
} from "../../src/tools/date";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const farm = url.searchParams.get("farm") || "unknown";
  const site = url.searchParams.get("site") || "unknown";
  const start = url.searchParams.get("start") ?? undefined;
  const end = url.searchParams.get("end") ?? undefined;

  const todayUTC = convertToUTCStartOfDay(new Date());

  if (farm === "unknown" || site === "unknown") {
    return new Response("Please provide a farm and a site", { status: 400 });
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

  try {
    // Fetch site data
    const siteApiResponse = await fetchSite(farm, site);

    if (!siteApiResponse.ok) {
      return new Response("Failed to fetch site", {
        status: siteApiResponse.status,
      });
    }
    const siteData: Site = await siteApiResponse.json();

    // Fetch financial statements data
    const financialStatementsApiResponse = await fetchFinancialStatements(
      farm,
      site
    );
    if (!financialStatementsApiResponse.ok) {
      return new Response("Failed to fetch statements", {
        status: financialStatementsApiResponse.status,
      });
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
    const miningHistoryApiresponse = await fetchMiningHistory(
      farm,
      site,
      convertDateToTimestamptzFormat(startMining),
      convertDateToTimestamptzFormat(endMining)
    );
    if (!miningHistoryApiresponse.ok) {
      return new Response("Failed to fetch mining history", {
        status: miningHistoryApiresponse.status,
      });
    }

    const miningHistoryData: Database["public"]["Tables"]["mining"]["Row"][] =
      await miningHistoryApiresponse.json();

    const reports = getSiteDailyMiningReports(
      financialStatementsData,
      miningHistoryData,
      siteData,
      1,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined
    );

    return new Response(JSON.stringify(reports), {
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Error api site " + error);
    return new Response("Failed to fetch site from gateway " + error, {
      status: 500,
    });
  }
};

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
  site: string,
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
  site: string,
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
