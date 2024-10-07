import { formatFarmDates } from "@/tools/farm";
import { formatSiteDates } from "@/tools/site";
import { Database } from "@/types/supabase";

export type TableType = keyof Database["public"]["Tables"];
export type TableRow = Database["public"]["Tables"][TableType]["Row"];

export type Contract = Database["public"]["Tables"]["contracts"]["Row"] & {
  api: Database["public"]["Tables"]["apis"]["Row"];
};

export type Container = Database["public"]["Tables"]["containers"]["Row"] & {
  asics: Database["public"]["Tables"]["asics"]["Row"];
  location: Database["public"]["Tables"]["locations"]["Row"];
};

export type Site = Database["public"]["Tables"]["sites"]["Row"] & {
  location: Database["public"]["Tables"]["locations"]["Row"];
  contract: Contract;
  operator: Database["public"]["Tables"]["operators"]["Row"];
  containers: Container[];
  powerPlant: Database["public"]["Tables"]["powerPlants"]["Row"];
};

export type Farm = Database["public"]["Tables"]["farms"]["Row"] & {
  sites: Site[];
  location: Database["public"]["Tables"]["locations"]["Row"];
  society: Database["public"]["Tables"]["societies"]["Row"];
  token: Database["public"]["Tables"]["tokens"]["Row"];
  vaults: Database["public"]["Tables"]["vaults"]["Row"][];
};

/// SUPABASE API RESPONSE ///

export type ContractApiResponse =
  Database["public"]["Tables"]["contracts"]["Row"] & {
    apis: Database["public"]["Tables"]["apis"]["Row"];
  };

export type ContainerApiResponse =
  Database["public"]["Tables"]["containers"]["Row"] & {
    asics: Database["public"]["Tables"]["asics"]["Row"];
    locations: Database["public"]["Tables"]["locations"]["Row"];
  };

export type SiteApiResponse = Database["public"]["Tables"]["sites"]["Row"] & {
  locations: Database["public"]["Tables"]["locations"]["Row"];
  contracts: ContractApiResponse;
  operators: Database["public"]["Tables"]["operators"]["Row"];
  containers: ContainerApiResponse[];
  powerPlants: Database["public"]["Tables"]["powerPlants"]["Row"];
};

export type FarmApiResponse = Database["public"]["Tables"]["farms"]["Row"] & {
  sites: SiteApiResponse[];
  locations: Database["public"]["Tables"]["locations"]["Row"];
  societies: Database["public"]["Tables"]["societies"]["Row"];
  tokens: Database["public"]["Tables"]["tokens"]["Row"];
  vaults: Database["public"]["Tables"]["vaults"]["Row"][];
};

export function mapContractApiResponseToContract(
  contract: ContractApiResponse
): Contract {
  const { apis, ...rest } = contract;
  return {
    ...rest,
    api: apis,
  };
}

export function mapContainerApiResponseToContainer(
  container: ContainerApiResponse
): Container {
  const { locations, ...rest } = container;
  return {
    ...rest,
    location: locations,
  };
}

export function mapSiteApiResponseToSite(_site: SiteApiResponse): Site {
  const { locations, contracts, operators, containers, powerPlants, ...rest } =
    _site;
  const site = {
    ...rest,
    location: locations,
    contract: mapContractApiResponseToContract(contracts),
    operator: operators,
    containers: containers.map(mapContainerApiResponseToContainer),
    powerPlant: powerPlants,
  };

  return formatSiteDates(site);
}

export function mapFarmApiResponseToFarm(_farm: FarmApiResponse): Farm {
  const { locations, societies, tokens, vaults, sites, ...rest } = _farm;
  return {
    ...rest,
    sites: sites.map(mapSiteApiResponseToSite),
    location: locations,
    society: societies,
    token: tokens,
    vaults: vaults,
  };
}
