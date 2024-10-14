import { Site } from "@/types/supabase.extend";
import {
  calculateContainersPower,
  calculateContainersPowerHistory,
} from "./container";
import { PowerCapacityHistory } from "@/types/Container";
import { getTodayDate } from "../date";

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
  console.log("");
  console.log(
    "=> calculateSitePower : Site " +
      site.slug +
      " started at " +
      siteStartedAt.toISOString()
  );

  const containers = site.containers;
  return calculateContainersPower(containers, day);
}

export function calculateSitePowerHistory(
  site: Site,
  startDate?: Date,
  endDate?: Date
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
    return [];
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

  return calculateContainersPowerHistory(containers, start, end, []);
}
