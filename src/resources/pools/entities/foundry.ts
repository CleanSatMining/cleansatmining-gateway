import { getNDaysAgo } from "@/tools/date";
import { calculateSitePower } from "@/tools/powerhistory/site";
import {
  APIMiningPoolResponse,
  DayDataFoundry,
  DayPoolData,
} from "@/types/Pool";
import { Site } from "@/types/supabase.extend";
import BigNumber from "bignumber.js";

interface FoundryApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

interface FoundryApiResult {
  days: DayDataFoundry[];
  error?: FoundryApiError;
}

export async function foundryHistory(
  first: number,
  site: Site
): Promise<APIMiningPoolResponse> {
  // fetch all data

  console.log("FOUNDRY API", site.slug);
  const apiKey = getApiSecrets(site);
  const username = site.contract.api.username;
  const url = site.contract.api.url;
  console.log("FOUNDRY API username", username);
  console.log("FOUNDRY API url", url);
  console.log("FOUNDRY API apiKey", apiKey);

  const ret = await _foundryHistory(first, apiKey, `${url}${username}`, site);

  const days: DayPoolData[] = convertAPIDataToStandard(site, ret.days);

  const updated = new Date().getTime();

  return { site: site.slug, updated, days };
}

export async function foundryData(first: number, site: Site): Promise<any> {
  // fetch all data

  const apiKey = getApiSecrets(site);
  const username = site.contract.api.username;
  const url = site.contract.api.url;
  console.log("FOUNDRY API", site.slug);
  console.log("FOUNDRY API username", username);
  console.log("FOUNDRY API apiKey", apiKey);
  console.log("FOUNDRY API url", url);

  const ret = await _foundryHistory(first, apiKey, `${url}${username}`, site);

  const days = ret.days;

  const updated = new Date().getTime();

  return { updated, days };
}

async function _foundryHistory(
  first: number,
  apiKey: string,
  url: string,
  site: Site
): Promise<FoundryApiResult> {
  let json: FoundryApiResult = {
    days: [],
    error: undefined,
  };
  const input_timestamp = getNDaysAgo(first).getTime();
  const firstMiningDateTimestamp = site.started_at
    ? new Date(site.started_at).getTime()
    : input_timestamp;
  const firstDateTimestamp = Math.max(
    input_timestamp,
    firstMiningDateTimestamp
  );
  const urlWithParam = `${url}?startDateUnixMs=${firstDateTimestamp}`;

  //console.log('ANTPOOL input', post_data, apiKey);
  try {
    console.log("FOUNDRY API URL", urlWithParam);

    const result = await fetch(urlWithParam, {
      method: "GET",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-API-KEY": apiKey,
      },
    });

    if (result.ok) {
      const response: DayDataFoundry[] = await result.json();
      json = {
        days: response,
      };
    } else {
      const erreur: FoundryApiError = await result.json();
      console.error("FOUNDRY Revenu summary error" + JSON.stringify(erreur));
      json = {
        days: [],
        error: erreur,
      };
    }
  } catch (err) {
    console.error("catch FOUNDRY Revenu summary error" + err);
  }

  return json;
}

/**
 * convertAPIDataToStandard
 * @param siteId
 * @param periodsData
 * @returns
 */
function convertAPIDataToStandard(
  site: Site,
  periodsData: DayDataFoundry[]
): DayPoolData[] {
  const result: DayPoolData[] = periodsData.map<DayPoolData>((day) => {
    const { hashrateTHs: hashrateMax, units } = calculateSitePower(
      site,
      new Date(day.startTime)
    );

    const hashrate = new BigNumber(day.hashrate).dividedBy(1000);
    const efficiency = hashrate.dividedBy(hashrateMax);
    return {
      site: site.slug,
      date: day.startTime,
      efficiency: efficiency.toNumber(),
      hashrateTHs: hashrate.toNumber(),
      revenue: day.totalAmount,
      uptimePercentage: efficiency.times(100).toNumber(),
      uptimeTotalMinutes: efficiency.times(24 * 60).toNumber(),
      uptimeTotalMachines: efficiency.times(units).toNumber(),
    };
  });
  return result;
}

/**
 * getApiSecrets
 * @param username
 * @returns
 */
function getApiSecrets(site: Site): string {
  let apiKey = "";

  switch (site.slug) {
    case "moore": {
      apiKey = process.env.FOUNDRY_D_API_KEY_ACCOUNT ?? "";
      break;
    }
    case "pecos": {
      apiKey = process.env.FOUNDRY_D_PECOS_API_KEY_ACCOUNT ?? "";
      break;
    }
    case "gamma-missouri": {
      apiKey = process.env.FOUNDRY_G_API_KEY_ACCOUNT ?? "";
      break;
    }
    default: {
      break;
    }
  }
  return apiKey;
}
