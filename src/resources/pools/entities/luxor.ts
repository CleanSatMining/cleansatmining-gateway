import { APIMiningPoolResponse, DayDataLuxor } from "@/types/Pool";
import { Site } from "@/types/supabase.extend";
import BigNumber from "bignumber.js";

interface RevenueHistory {
  data: {
    getHashrateScoreHistory: {
      nodes: DayDataLuxor[];
    };
  };
}

export async function luxorHistory(
  first: number,
  site: Site
): Promise<APIMiningPoolResponse> {
  let json;
  try {
    const username = site.contract.api.username;
    const url = site.contract.api.url;
    console.log(
      "LUXOR API PARAMETERS: x-lux-api-key",
      process.env.LUXOR_API_KEY_ACCOUNT
    );
    console.log("LUXOR API PARAMETERS: username", username);
    console.log("LUXOR API PARAMETERS: url", url);

    const result = await fetch(url, {
      method: "POST",
      headers: {
        "x-lux-api-key": process.env.LUXOR_API_KEY_ACCOUNT ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
    
          query getHashrateScoreHistory($mpn: MiningProfileName!, $uname: String!, $first : Int) {
            getHashrateScoreHistory(mpn: $mpn, uname: $uname, first: $first, orderBy: DATE_DESC) {
                nodes {
                    date
                    efficiency
                    hashrate
                    revenue
                    uptimePercentage
                    uptimeTotalMinutes
                    uptimeTotalMachines
                  }
                }
          }
            `,
        variables: {
          uname: username,
          mpn: "BTC",
          first: first,
        },
      }),
    });

    if (result.ok) {
      const response: RevenueHistory = await result.json();
      //console.log(JSON.stringify(response, null, 4));
      const history: APIMiningPoolResponse = {
        site: site.slug,
        updated: new Date().getTime(),
        days: response.data.getHashrateScoreHistory.nodes.map((node) => {
          return {
            site: site.slug,
            date: node.date,
            efficiency: new BigNumber(node.efficiency)
              .dividedBy(100)
              .toNumber(),
            hashrateTHs: new BigNumber(node.hashrate)
              .dividedBy(1000000000000)
              .toNumber(),
            revenue: node.revenue,
            uptimePercentage: node.uptimePercentage,
            uptimeTotalMinutes: node.uptimeTotalMinutes,
            uptimeTotalMachines: node.uptimeTotalMachines,
          };
        }),
      };
      json = history; // JSON.stringify(history, null);
    } else {
      const erreur: APIMiningPoolResponse = {
        site: site.slug,
        updated: new Date().getTime(),
        days: [],
        error: await result.json(),
      };
      json = erreur; // JSON.stringify(erreur);
      console.error("LUXOR Revenu summary error" + JSON.stringify(erreur));
    }
  } catch (err) {
    const erreur: APIMiningPoolResponse = {
      site: site.slug,
      updated: new Date().getTime(),
      days: [],
      error: err,
    };
    json = erreur; // JSON.stringify(erreur);
    console.error("LUXOR Revenu summary error" + err);
  }
  return json;
}

export async function luxorData(
  url: string,
  username: string,
  first: number,
  siteId: string,
  subaccountId: number | undefined
): Promise<any | undefined> {
  let json;
  try {
    console.log(
      "LUXOR API PARAMETERS: x-lux-api-key",
      process.env.LUXOR_API_KEY_ACCOUNT
    );
    console.log("LUXOR API PARAMETERS: username", username);
    console.log("LUXOR API PARAMETERS: url", url);

    const result = await fetch(url, {
      method: "POST",
      headers: {
        "x-lux-api-key": process.env.LUXOR_API_KEY_ACCOUNT ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
    
          query getHashrateScoreHistory($mpn: MiningProfileName!, $uname: String!, $first : Int) {
            getHashrateScoreHistory(mpn: $mpn, uname: $uname, first: $first, orderBy: DATE_DESC) {
                nodes {
                    date
                    efficiency
                    hashrate
                    revenue
                    uptimePercentage
                    uptimeTotalMinutes
                    uptimeTotalMachines
                  }
                }
          }
            `,
        variables: {
          uname: username,
          mpn: "BTC",
          first: first,
        },
      }),
    });

    if (result.ok) {
      const response: RevenueHistory = await result.json();
      //console.log(JSON.stringify(response, null, 4));
      const history = {
        updated: new Date().getTime(),
        days: response.data.getHashrateScoreHistory.nodes,
      };
      json = history; // JSON.stringify(history, null);
    } else {
      const erreur: APIMiningPoolResponse = {
        site: siteId,
        updated: new Date().getTime(),
        days: [],
        error: await result.json(),
      };
      json = erreur; // JSON.stringify(erreur);
      console.error("LUXOR Revenu summary error" + JSON.stringify(erreur));
    }
  } catch (err) {
    console.error("LUXOR Revenu summary error" + err);
  }
  return json;
}
