import { MiningBalance, MiningEquipment } from "@/types/MiningReport";

export type BalanceSheet = {
  start: Date;
  end: Date;
  days: number;
  balance: MiningBalance;
  equipments: EquipmentPerformance;
};

export type EquipmentPerformance = {
  uptime: number;
  hashrateTHs: number;
} & MiningEquipment;

export type DetailedBalanceSheet = BalanceSheet & {
  details: BalanceSheet[];
};
