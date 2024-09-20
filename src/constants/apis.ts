import { Config } from "./supabase.config";
import { TABLES } from "./init";

export type Api = {
  name: string;
  url: string;
  method: string;
  fields: string[];
  headers?: Record<string, string>;
  parameters: {
    select: {
      full: () => string;
      partial: () => string;
    };
  };
};

export function createParameters(parameters: Record<string, string>): string {
  let result = "";
  for (const key in parameters) {
    if (parameters.hasOwnProperty(key)) {
      const value = parameters[key];
      result += key + "=" + value + "&";
    }
  }
  return result === "" ? "" : "?" + result;
}

export function getTableFields(tablename: string): string[] {
  const table = TABLES[tablename];
  const tableType = table.type;
  if (!tableType) {
    console.log("Table " + tablename + " not found");
    throw new Error("Table " + tablename + " not found");
  }
  const fields: string[] = Object.keys(table.row) as string[];

  return fields;
}

export function getSelectTable(tablename: string): string {
  const table = TABLES[tablename];
  const tableType = table.type;
  if (!tableType) {
    console.log("Table " + tablename + " not found");
    throw new Error("Table " + tablename + " not found");
  }

  const fields: string[] = Object.keys(table.row) as string[];

  if (Config[tablename]) {
    const have = Config[tablename].have;
    for (const item of have) {
      const itemFields = getSelectTable(item.table);
      fields.push(item.table + "(" + itemFields + ")");
    }
  }

  return fields.join(",");
}

export const GET_FARMS: Api = {
  name: "GET_FARMS",
  url: "/rest/v1/farms",
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    apiKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsY3p5d2hjdGZhb3N4cXRqd2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ2NTg2MTQsImV4cCI6MjA0MDIzNDYxNH0.aJeUHh1j4ZT8mUVwUhuvx2P4gMmrZDDyM920XhD0p-c",
  },
  fields: getTableFields("farms"),
  parameters: {
    select: {
      full: () => getSelectTable("farms"),
      partial: () => {
        return "";
      },
    },
  },
};

export const INSERT_MINING: Api = {
  name: "INSERT_MINING",
  url: "/rest/v1/mining",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  fields: getTableFields("sites"),
  parameters: {
    select: {
      full: () => getSelectTable("mining"),
      partial: () => {
        return "";
      },
    },
  },
};
