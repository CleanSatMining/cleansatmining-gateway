import { Miners } from "@/types/MiningReport";

export function concatUniqueAsics(
  asics1: Miners[],
  asics2: Miners[]
): Miners[] {
  const asicMap = new Map<number, Miners>();

  const asics = asics1.concat(asics2);

  asics.forEach((asic: Miners) => {
    if (!asicMap.has(asic.containerId)) {
      asicMap.set(asic.containerId, asic);
    }
  });

  return Array.from(asicMap.values());
}
