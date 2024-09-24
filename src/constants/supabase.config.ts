import { TableType } from "@/types/supabase.extend";

export enum ObjectType {
  Object = "object",
  Array = "array",
}

export type TableConfig = {
  have: {
    field: string;
    table: TableType;
    type: ObjectType;
  }[];
};

export const Config: Record<string, TableConfig> = {
  farms: {
    have: [
      {
        field: "sites",
        table: "sites",
        type: ObjectType.Array,
      },
      {
        field: "society",
        table: "societies",
        type: ObjectType.Object,
      },
      {
        field: "token",
        table: "tokens",
        type: ObjectType.Object,
      },
      {
        field: "vault",
        table: "vaults",
        type: ObjectType.Object,
      },
      {
        field: "location",
        table: "locations",
        type: ObjectType.Object,
      },
      {
        field: "fundraisings",
        table: "fundraisings",
        type: ObjectType.Array,
      },
    ],
  },
  sites: {
    have: [
      {
        field: "location",
        table: "locations",
        type: ObjectType.Object,
      },
      {
        field: "operator",
        table: "operators",
        type: ObjectType.Object,
      },
      {
        field: "powerPlant",
        table: "powerPlants",
        type: ObjectType.Object,
      },
      {
        field: "containers",
        table: "containers",
        type: ObjectType.Array,
      },
      {
        field: "contracts",
        table: "contracts",
        type: ObjectType.Object,
      },
    ],
  },
  containers: {
    have: [
      {
        field: "asic",
        table: "asics",
        type: ObjectType.Object,
      },
      {
        field: "location",
        table: "locations",
        type: ObjectType.Object,
      },
    ],
  },
  contracts: {
    have: [
      {
        field: "api",
        table: "apis",
        type: ObjectType.Object,
      },
    ],
  },
};

export const OP = {
  EQUALS: (param: string) => {
    return "eq." + param;
  },
};
