import { Site } from "@/types/supabase.extend";
import {
  calculateContainersPower,
  calculateContainersPowerHistory,
  getActiveContainers,
} from "./container";
import { PowerCapacityHistory } from "@/types/Container";
import { calculateDaysBetweenDates, getTodayDate } from "../date";
import { Miners, MiningEquipment } from "@/types/MiningReport";
import BigNumber from "bignumber.js";

export function calculateSitePower(
  site: Site,
  day: Date
): { watts: number; hashrateTHs: number; units: number } {
  const siteStartedAt = site.started_at
    ? new Date(site.started_at)
    : getTodayDate();
  const siteClosedAt = site.closed_at
    ? new Date(site.closed_at)
    : getTodayDate();

  if (
    day.getTime() < siteStartedAt.getTime() ||
    siteClosedAt.getTime() <= day.getTime()
  ) {
    // site closed
    console.warn(
      "Site " + site.slug + " closed at " + siteClosedAt.toISOString()
    );
    return { watts: 0, hashrateTHs: 0, units: 0 };
  }

  const containers = site.containers;
  return calculateContainersPower(containers, day);
}

export function calculateSitePowerHistory(
  site: Site,
  startDate: Date,
  endDate: Date
): PowerCapacityHistory[] {
  const containers = site.containers.filter((container) => {
    // Check if the container is active
    if (container.start === null || container.start === undefined) {
      console.warn(
        "WARN The container " + container.slug + " has no start date",
        container.start
      );
      return false;
    }
    return true;
  });

  if (containers.length === 0) {
    console.warn(
      "WARN The site " +
        site.slug +
        " has no active containers for the period " +
        startDate +
        " to " +
        endDate
    );
    return [
      {
        start: startDate,
        end: endDate,
        powerW: 0,
        hashrateTHs: 0,
        days: calculateDaysBetweenDates(startDate, endDate),
        containers: [],
      },
    ];
  }

  const sortedContainers = containers.sort((a, b) => {
    const dateA = a.start ? new Date(a.start) : new Date();
    const dateB = b.start ? new Date(b.start) : new Date();
    return dateA.getTime() - dateB.getTime();
  });

  const end: Date = endDate ?? getTodayDate();
  const start: Date =
    startDate ??
    (sortedContainers[0].start
      ? new Date(sortedContainers[0].start)
      : getTodayDate());

  const powerHistory = calculateContainersPowerHistory(
    containers,
    start,
    end,
    []
  );
  if (powerHistory.length === 0) {
    return [
      {
        start,
        end,
        powerW: 0,
        hashrateTHs: 0,
        days: calculateDaysBetweenDates(start, end),
        containers: [],
      },
    ];
  }

  return powerHistory;
}

export function getSiteEquipments(site: Site, day: Date): MiningEquipment {
  const containers = getActiveContainers(site.containers, day);

  const equipments: MiningEquipment = containers.reduce(
    (acc, container) => {
      const asics = container.asics;
      const miners: Miners = {
        containerId: container.id,
        units: container.units,
        manufacturer: asics.manufacturer,
        model: asics.model,
        hashrateTHs: asics.hashrateTHs,
        powerW: asics.powerW,
        cost: container.cost,
      };
      const equipment: MiningEquipment = {
        hashrateTHsMax: new BigNumber(acc.hashrateTHsMax)
          .plus(new BigNumber(asics.hashrateTHs).times(container.units))
          .toNumber(),
        powerWMax: new BigNumber(acc.powerWMax)
          .plus(new BigNumber(asics.powerW).times(container.units))
          .toNumber(),
        totalCost: new BigNumber(acc.totalCost).plus(container.cost).toNumber(),
        asics: acc.asics.concat(miners),
      };

      return equipment;
    },
    {
      hashrateTHsMax: 0,
      powerWMax: 0,
      totalCost: 0,
      asics: [] as Miners[],
    } as MiningEquipment
  );

  return equipments;
}
