import {
  convertDateToTimestamptzFormat,
  calculateDaysBetweenDates,
  convertToUTCStartOfDay,
} from "./date";

describe("date.ts", () => {
  describe("convertDateToTimestamptzFormat", () => {
    it("should convert a date to the correct timestamptz format", () => {
      const date = new Date("2024-09-18T16:51:34.083Z");
      const result = convertDateToTimestamptzFormat(date);
      expect(result).toBe("2024-09-18T16:51:34.083Z+00:00");
    });

    it("should handle dates with different milliseconds", () => {
      const date = new Date("2024-09-18T16:51:34.123Z");
      const result = convertDateToTimestamptzFormat(date);
      expect(result).toBe("2024-09-18T16:51:34.123Z+00:00");
    });
  });

  describe("calculateDaysBetweenDates", () => {
    it("should calculate the correct number of days between two dates", () => {
      const start = new Date("2023-01-01T16:51:34.123Z");
      const end = new Date("2023-01-10T16:51:34.123Z");
      const result = calculateDaysBetweenDates(start, end);
      expect(result).toBe(10);
    });

    it("should return 1 if the dates are the same", () => {
      const start = new Date("2023-01-01T16:51:34.123Z");
      const end = new Date("2023-01-01T16:51:34.123Z");
      const result = calculateDaysBetweenDates(start, end);
      expect(result).toBe(1);
    });

    it("should handle leap years correctly", () => {
      const start = new Date("2020-02-28T16:51:34.123Z");
      const end = new Date("2020-03-01T16:51:34.123Z");
      const result = calculateDaysBetweenDates(start, end);
      expect(result).toBe(3);
    });
  });
});

describe("convertToUTCStartOfDay", () => {
  it("should convert a date string to UTC start of day", () => {
    const dateString = new Date("2023-10-01");
    const result = convertToUTCStartOfDay(dateString);
    expect(result.toISOString()).toBe("2023-10-01T00:00:00.000Z");
  });

  it("should handle different date formats", () => {
    const dateString = new Date("2023-10-01T15:30:00Z");
    const result = convertToUTCStartOfDay(dateString);
    expect(result.toISOString()).toBe("2023-10-01T00:00:00.000Z");
  });

  it("should handle leap years correctly", () => {
    const dateString = new Date("2020-02-29");
    const result = convertToUTCStartOfDay(dateString);
    expect(result.toISOString()).toBe("2020-02-29T00:00:00.000Z");
  });
});
