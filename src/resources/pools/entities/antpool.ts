import {
  APIMiningPoolResponse,
  DayDataAntpool,
  DayPoolData,
} from "@/types/Pool";
import BigNumber from "bignumber.js";
import * as crypto from "crypto";
import { Site } from "@/types/supabase.extend";
import { calculateSitePower } from "@/tools/powerhistory/site";

const PAGE_SIZE = 50; //page size max

interface RevenueHistory {
  code: number;
  message: string;
  data: {
    page: number;
    totalPage: number;
    pageSize: number;
    totalRecord: number;
    rows: DayDataAntpool[];
  };
}

interface AntpoolApiResult {
  days?: DayDataAntpool[];
  /* eslint-disable */
  error?: any;
  /* eslint-enable */
}

export async function antpoolHistory(
  first: number,
  site: Site
): Promise<APIMiningPoolResponse> {
  if (site.contract.api.poolId !== 1) {
    throw new Error("Antpool API is not available for this pool");
  }

  const username = site.contract.api.username;
  const url = site.contract.api.url;

  const returns = [];

  // fetch all data

  const { apiKey, apiSign } = getApiSecrets(site);
  console.log("ANTPOOL API username", username);
  console.log("ANTPOOL API url", url);
  console.log("ANTPOOL API apiKey", apiKey);
  console.log("ANTPOOL API apiSign", apiSign);
  const ret = await _antPoolHistory(first, apiKey, apiSign, url);
  if (ret.days === undefined)
    return {
      site: site.slug,
      days: [],
      error: ret.error,
      updated: new Date().getTime(),
    };
  const result = new Map(ret.days.map((i) => [i.timestamp, i]));
  returns.push(result);

  // consolid data
  const sumData = new Map<string, DayDataAntpool>();
  for (const data of returns) {
    data.forEach((value: DayDataAntpool, key: string) => {
      if (sumData.has(key)) {
        const oldMiningValue = sumData.get(key);
        const newMiningValue: DayDataAntpool = {
          timestamp: value.timestamp,
          hashrate:
            value.hashrate +
            (oldMiningValue ? " + " + oldMiningValue.hashrate : ""),
          hashrate_unit: new BigNumber(value.hashrate_unit)
            .plus(oldMiningValue ? oldMiningValue.hashrate_unit : 0)
            .toNumber(),
          ppsAmount: new BigNumber(value.ppsAmount)
            .plus(oldMiningValue ? oldMiningValue.ppsAmount : 0)
            .toNumber(),
          pplnsAmount: new BigNumber(value.pplnsAmount)
            .plus(oldMiningValue ? oldMiningValue.pplnsAmount : 0)
            .toNumber(),
          soloAmount: new BigNumber(value.soloAmount)
            .plus(oldMiningValue ? oldMiningValue.soloAmount : 0)
            .toNumber(),
          ppappsAmount: new BigNumber(value.ppappsAmount)
            .plus(oldMiningValue ? oldMiningValue.ppappsAmount : 0)
            .toNumber(),
          ppapplnsAmount: new BigNumber(value.ppapplnsAmount)
            .plus(oldMiningValue ? oldMiningValue.ppapplnsAmount : 0)
            .toNumber(),
          fppsBlockAmount: new BigNumber(value.fppsBlockAmount)
            .plus(oldMiningValue ? oldMiningValue.fppsBlockAmount : 0)
            .toNumber(),
          fppsFeeAmount: new BigNumber(value.fppsFeeAmount)
            .plus(oldMiningValue ? oldMiningValue.fppsFeeAmount : 0)
            .toNumber(),
        };
        sumData.set(key, newMiningValue);
      } else {
        sumData.set(key, value);
      }
    });
  }

  const days: DayPoolData[] = convertAPIDataToStandard(site, [
    ...sumData.values(),
  ]);
  const updated = new Date().getTime();
  return { site: site.slug, days, updated };
}

export async function antpoolData(
  first: number,
  site: Site
): Promise<AntpoolApiResult> {
  const { apiKey, apiSign } = getApiSecrets(site);
  const username = site.contract.api.username;
  const url = site.contract.api.url;
  console.log("ANTPOOL API usernames", username);
  console.log("ANTPOOL API apiKey", apiKey);
  console.log("ANTPOOL API apiSign", apiSign);
  console.log("ANTPOOL API url", url);

  const ret = await _antPoolHistory(first, apiKey, apiSign, url);
  if (ret.days === undefined) return { days: [], error: ret.error };

  const days = ret.days;
  return { days };
}

async function _antPoolHistory(
  first: number,
  apiKey: string,
  apiSign: (string | number)[],
  url: string
): Promise<AntpoolApiResult> {
  let json: AntpoolApiResult = {
    days: undefined,
    error: undefined,
  };

  const totalPage: number = Math.ceil(first / PAGE_SIZE);

  let periodsData: DayDataAntpool[] = [];
  let totalPageReturned = totalPage;

  for (let page = 1; page <= totalPage; page++) {
    if (page <= totalPageReturned) {
      const post_data = new URLSearchParams({
        key: apiKey,
        nonce: apiSign[1].toString(),
        signature: apiSign[0].toString(),
        coin: "BTC",
        pageSize: PAGE_SIZE.toString(),
        page: page.toString(),
        type: "recv",
      });
      //console.log("ANTPOOL input", post_data, url);
      try {
        const result = await fetch(url, {
          method: "POST",
          body: post_data,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

        if (result.ok) {
          const response: RevenueHistory = await result.json();

          //console.log("ANTPOOL response", JSON.stringify(response, null, 4));
          if (response.data.page === page) {
            periodsData = [...periodsData, ...response.data.rows];
          }
          totalPageReturned = response.data.pageSize;
        } else {
          const erreur = {
            message: await result.json(),
          };
          json = { days: [], error: erreur }; // JSON.stringify(erreur);
          console.error(
            "ANTPOOL Revenu summary error" + JSON.stringify(erreur)
          );
        }
      } catch (err) {
        console.error("catch ANTPOOL Revenu summary error" + err);
      }
    }
  }
  //console.log('ANTPOOL', periodsData);
  // const result: MiningSummaryPerDay[] = convertAPIDataToStandard(
  //   siteId,
  //   periodsData,
  // );

  console.log("ANTPOOL", periodsData.length);

  json = { days: periodsData.slice(0, first) };
  return json;
}

/**
 * convertAPIDataToStandard
 * @param siteId
 * @param periodsData
 * @returns
 */
function convertAPIDataToStandard(site: Site, periodsData: DayDataAntpool[]) {
  const result: DayPoolData[] = periodsData.map<DayPoolData>((day) => {
    const { hashrateTHs: hashrateMax, units } = calculateSitePower(
      site,
      new Date(day.timestamp)
    );

    console.log("ANTPOOL", day.timestamp, hashrateMax, units);

    const efficiency = new BigNumber(day.hashrate_unit)
      .dividedBy(1000000000000)
      .dividedBy(hashrateMax);
    return {
      site: site.slug,
      date: day.timestamp.replace(" 00:00:00", "T00:00:00+00:00"), //2024-03-10 00:00:00 => 2024-03-10T00:00:00+00:00
      efficiency: efficiency.toNumber(),
      hashrateTHs: new BigNumber(day.hashrate_unit)
        .dividedBy(1000000000000)
        .toNumber(),
      revenue: new BigNumber(day.fppsBlockAmount)
        .plus(day.fppsFeeAmount)
        .toNumber(),
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
function getApiSecrets(site: Site) {
  let apiSign = ["", 0];
  let apiKey = "";
  let apiSecret = "";
  //console.log('ANTPOOL username', username, apiSign);

  console.log("ANTPOOL API site", site.slug);

  switch (site.slug) {
    case "virunga": {
      console.log("virunga");
      apiKey = process.env.ANTPOOL_A_API_KEY_ACCOUNT ?? "";
      apiSecret = process.env.ANTPOOL_A_API_SIGN_SECRET ?? "";
      apiSign = getSignature(site.contract.api.username, apiKey, apiSecret);
      break;
    }
    case "carelie": {
      apiKey = process.env.ANTPOOL_O_API_KEY_ACCOUNT ?? "";
      apiSecret = process.env.ANTPOOL_O_API_SIGN_SECRET ?? "";
      apiSign = getSignature(site.contract.api.username, apiKey, apiSecret);
      break;
    }
    case "itaipu": {
      apiKey = process.env.ANTPOOL_B_API_KEY_ACCOUNT ?? "";
      apiSecret = process.env.ANTPOOL_B_API_SIGN_SECRET ?? "";
      apiSign = getSignature(site.contract.api.username, apiKey, apiSecret);

      break;
    }
    default: {
      break;
    }
  }
  return { apiKey, apiSign };
}

/**
 * getSignature
 *
 * @param username
 * @returns
 */
function getSignature(username: string, key: string, secret: string) {
  const nonce = Math.floor(new Date().getTime() / 1000);

  const msgs = username + key + nonce;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(msgs)
    .digest("hex")
    .toUpperCase();

  return [signature, nonce];
}
