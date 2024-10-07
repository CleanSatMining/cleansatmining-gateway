import { DailyMiningReport } from "./MiningReport";

export interface MicroServiceMiningReportResponse {
  farm: string;
  site?: string;
  start?: Date;
  end?: Date;
  numberOfDays: number;
  btcSellPrice: number;
  data: DailyMiningReport[];
}
