import { Farm, Site } from "@/types/supabase.extend";
import {
  calculateContainersPower,
  calculateContainersPowerHistory,
} from "./container";
import { PowerCapacityHistory } from "@/types/Container";
import { calculateDaysBetweenDates, getTodayDate } from "../date";

export function calculateFarmPower(
  farm: Farm,
  day: Date
): {
  watts: number;
  hashrateTHs: number;
  units: number;
} {
  const containers = farm.sites.reduce((acc, site) => {
    const startedAt = site.started_at
      ? new Date(site.started_at)
      : getTodayDate();
    const closedAt = site.closed_at ? new Date(site.closed_at) : getTodayDate();
    if (
      day.getTime() < startedAt.getTime() ||
      closedAt.getTime() <= day.getTime()
    ) {
      // site closed
      console.warn(
        "Site " + site.slug + " closed at " + closedAt.toISOString()
      );
      return acc;
    }
    return acc.concat(site.containers);
  }, [] as Site["containers"]);

  const activeContainers = containers.filter((container) => {
    // Check if the container is active
    if (container.start === null || container.start === undefined) {
      console.warn("Container is not active", container.id, container.start);
      return false;
    }
    return true;
  });

  if (activeContainers.length === 0) {
    return { watts: 0, hashrateTHs: 0, units: 0 };
  }

  return calculateContainersPower(activeContainers, day);
}
export function calculateFarmPowerHistory(
  farm: Farm,
  startDate: Date,
  endDate: Date
): PowerCapacityHistory[] {
  const containers = farm.sites.reduce((acc, site) => {
    return acc.concat(site.containers);
  }, [] as Site["containers"]);

  const activeContainers = containers.filter((container) => {
    // Check if the container is active
    if (container.start === null || container.start === undefined) {
      console.warn("Container is not active", container.id, container.start);
      return false;
    }
    return true;
  });

  if (activeContainers.length === 0) {
    console.warn(
      "WARN The farme " +
        farm.slug +
        " has no active containers for the period " +
        startDate +
        " to " +
        endDate
    );
    return [
      {
        start: startDate,
        end: endDate,
        days: calculateDaysBetweenDates(startDate, endDate),
        hashrateTHs: 0,
        powerW: 0,
        containers: [],
      },
    ];
  }

  const sortedContainers = activeContainers.sort((a, b) => {
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
    sortedContainers,
    start,
    end,
    []
  );
  if (powerHistory.length === 0) {
    return [
      {
        start: startDate,
        end: endDate,
        days: calculateDaysBetweenDates(startDate, endDate),
        hashrateTHs: 0,
        powerW: 0,
        containers: [],
      },
    ];
  }

  return powerHistory;
}
