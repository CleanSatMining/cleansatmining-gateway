import { Container } from "@/types/supabase.extend";
import { BigNumber } from "bignumber.js";
import { PowerCapacityHistory } from "@/types/Container";
import {
  getTodayDate,
  calculateDaysBetweenDates,
  convertToUTCStartOfDay,
} from "../date";

export function calculateContainersPower(
  _containers: Container[],
  day: Date
): { watts: number; hashrateTHs: number; units: number } {
  const _day = convertToUTCStartOfDay(day);
  const containers = _containers.filter((container) => {
    // Check if the container is active
    if (container.start === null || container.start === undefined) {
      console.warn("The container has no start date", container);
      return false;
    }

    const isStarted = new Date(container.start) <= _day;

    let isEnded = false;

    // check if the container is still active
    if (container.end !== null && container.end !== undefined) {
      isEnded = new Date(container.end) <= _day;
    }

    return isStarted && !isEnded;
  });

  // Calculate the electricity power of the site
  const watts = containers
    .reduce((acc, container) => {
      return acc.plus(
        new BigNumber(container.units).times(container.asics.powerW)
      );
    }, new BigNumber(0))
    .toNumber();

  // Calculate the hashrate of the site
  const hashrateTHs = containers
    .reduce((acc, container) => {
      return acc.plus(
        new BigNumber(container.units).times(container.asics.hashrateTHs)
      );
    }, new BigNumber(0))
    .toNumber();

  // calculate the number of units
  const units = containers.reduce((acc, container) => {
    return acc + container.units;
  }, 0);

  return { watts, hashrateTHs, units };
}
export function calculateContainersPowerHistory(
  sortedContainers: Container[],
  startDate: Date,
  endDate: Date,
  calculatedPowerCapacities: PowerCapacityHistory[]
): PowerCapacityHistory[] {
  const activeContainers = sortedContainers
    .filter((container) => {
      // Check if the container is active
      if (container.start === null || container.start === undefined) {
        // The container is not active
        return false;
      }
      const containerStartDate = new Date(container.start);
      const containerEndDate = container.end
        ? new Date(container.end)
        : new Date();
      if (containerStartDate <= startDate && startDate < containerEndDate) {
        // The container is active at the given start date
        return true;
      }
      return false;
    })
    .sort((a, b) => {
      const dateA = a.start ? new Date(a.start).getTime() : 0;
      const dateB = b.start ? new Date(b.start).getTime() : 0;
      return dateA - dateB;
    });

  if (activeContainers.length === 0) {
    return calculatedPowerCapacities;
  }

  // Calculate the power capacities of the containers at the given start date
  const { hashrateTHs, watts } = calculateContainersPower(
    activeContainers,
    startDate
  );

  // find the earliest end date
  const today = getTodayDate();
  const firstEndDate = activeContainers.reduce((acc, container) => {
    const containerEndDate = container.end ? new Date(container.end) : today;
    return containerEndDate < acc ? containerEndDate : acc;
  }, today);
  // find the next start date
  const nextContainerStartDate = sortedContainers.reduce((acc, container) => {
    const containerStartDate = container.start
      ? convertToUTCStartOfDay(new Date(container.start))
      : today;
    // check if current container start date is between the start date and the latest nearest date found
    return startDate < containerStartDate && containerStartDate < acc
      ? containerStartDate
      : acc;
  }, today);

  const nextContainerDate =
    firstEndDate < nextContainerStartDate
      ? firstEndDate
      : nextContainerStartDate;

  const nextStartDate =
    endDate < nextContainerDate ? endDate : nextContainerDate;

  console.log(
    "calculateContainersPowerHistory DATES START",
    startDate,
    nextStartDate,
    nextContainerDate
  );

  const days = calculateDaysBetweenDates(startDate, nextStartDate);

  const powerCapacity: PowerCapacityHistory = {
    start: startDate,
    end: nextStartDate,
    days,
    hashrateTHs,
    powerW: watts,
    containers: activeContainers.map((container) => {
      return {
        containerId: container.id,
        hashrateTHs: new BigNumber(container.asics.hashrateTHs)
          .times(container.units)
          .toNumber(),
        powerW: new BigNumber(container.asics.powerW)
          .times(container.units)
          .toNumber(),
        asics: {
          hashrateTHs: container.asics.hashrateTHs,
          powerW: container.asics.powerW,
          units: container.units,
          model: container.asics.model,
          manufacturer: container.asics.manufacturer,
        },
      };
    }),
  };

  calculatedPowerCapacities.push(powerCapacity);

  if (startDate < nextStartDate && nextStartDate < endDate) {
    return calculateContainersPowerHistory(
      sortedContainers,
      nextStartDate,
      endDate,
      calculatedPowerCapacities
    );
  }

  // remove when days is 0
  return calculatedPowerCapacities.filter(
    (powerCapacity) => powerCapacity.days > 0
  );
}
