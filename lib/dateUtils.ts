/**
 * Date utility functions for calculating time windows
 */

/**
 * Gets the date of the previous Wednesday
 * If today is Wednesday, returns last week's Wednesday
 * Otherwise returns the most recent Wednesday
 */
export function getLastWednesday(): Date {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 3 = Wednesday
  
  // Calculate days to subtract to get to the previous Wednesday
  // If today is Wednesday (3), we want last week's Wednesday (subtract 7)
  // If today is Thursday (4), we want yesterday (subtract 1)
  // If today is Tuesday (2), we want last week's Wednesday (subtract 6)
  let daysToSubtract: number;
  
  if (currentDay === 3) {
    // Today is Wednesday, get last week's Wednesday
    daysToSubtract = 7;
  } else if (currentDay > 3) {
    // Thursday (4) through Saturday (6), get this week's Wednesday
    daysToSubtract = currentDay - 3;
  } else {
    // Sunday (0) through Tuesday (2), get last week's Wednesday
    daysToSubtract = currentDay + 4; // 0->4, 1->5, 2->6
  }
  
  const lastWednesday = new Date(now);
  lastWednesday.setDate(now.getDate() - daysToSubtract);
  lastWednesday.setHours(0, 0, 0, 0); // Set to start of day
  
  return lastWednesday;
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
