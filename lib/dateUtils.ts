/**
 * Date utility functions for calculating time windows
 */

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Gets the date of the latest Wednesday (this week's Wednesday)
 * If today is Wednesday, returns today
 * Otherwise returns the most recent Wednesday
 */
export function getLatestWednesday(): Date {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 3 = Wednesday
  
  let daysToSubtract: number;
  
  if (currentDay === 3) {
    // Today is Wednesday, return today
    daysToSubtract = 0;
  } else if (currentDay > 3) {
    // Thursday (4) through Saturday (6), get this week's Wednesday
    daysToSubtract = currentDay - 3;
  } else {
    // Sunday (0) through Tuesday (2), get last week's Wednesday
    daysToSubtract = currentDay + 4; // 0->4, 1->5, 2->6
  }
  
  const latestWednesday = new Date(now);
  latestWednesday.setDate(now.getDate() - daysToSubtract);
  latestWednesday.setHours(0, 0, 0, 0); // Set to start of day
  
  return latestWednesday;
}

/**
 * Gets the date of the previous Wednesday
 * If today is Wednesday, returns last week's Wednesday
 * Otherwise returns the most recent Wednesday
 * @deprecated Use getLatestWednesday() instead
 */
export function getLastWednesday(): Date {
  return getLatestWednesday();
}

/**
 * Gets the date range for "this week"
 * Returns: {start: latest Wednesday, end: today}
 */
export function getThisWeekRange(): DateRange {
  const start = getLatestWednesday();
  const end = new Date();
  end.setHours(23, 59, 59, 999); // End of today
  
  return { start, end };
}

/**
 * Gets the date range for "last week"
 * Returns: {start: two Wednesdays ago, end: latest Wednesday (exclusive)}
 */
export function getLastWeekRange(): DateRange {
  const latestWednesday = getLatestWednesday();
  const start = new Date(latestWednesday);
  start.setDate(latestWednesday.getDate() - 7); // Go back 7 days to get two Wednesdays ago
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(latestWednesday);
  end.setHours(0, 0, 0, 0); // Start of latest Wednesday (exclusive end)
  
  return { start, end };
}

/**
 * Formats a date as ISO string for API calls
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString();
}

/**
 * Gets Unix timestamp (seconds) for a date
 */
export function getUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
