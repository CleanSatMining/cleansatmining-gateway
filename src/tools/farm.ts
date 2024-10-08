import { Farm } from "@/types/supabase.extend";
import { formatSiteDates } from "./site";

export function formatFarmDates(farm: Farm): Farm {
  farm.sites = farm.sites.map((site) => {
    return formatSiteDates(site);
  });
  return farm;
}
