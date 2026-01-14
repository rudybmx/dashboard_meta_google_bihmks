import { subMonths, subDays, startOfMonth, endOfMonth, differenceInDays, addDays } from 'date-fns';


/**
 * Calculates the previous period based on the current date range.
 * Logic: "Same period last month" (MoM).
 * If user selects Jan 1 - Jan 15, previous is Dec 1 - Dec 15.
 */
export const getPreviousPeriod = (start: Date, end: Date): { start: Date, end: Date } => {
  const durationInDays = differenceInDays(end, start);
  
  // Method 1: Precise Month Subtraction (User Request)
  // Shift both dates back by 1 month
  const prevStart = subMonths(start, 1);
  let prevEnd = subMonths(end, 1);

  // Correction for end of month edge cases (e.g. Mar 31 -> Feb 28)
  // date-fns subMonths handles this automatically (clamping to end of month)
  
  // Ensure the duration matches exactly if it's not a full month selection?
  // User asked for: "Use subtração de mês exata (date.setMonth(date.getMonth() - 1))"
  // But also implicitly wants to compare apple-to-apple duration.
  // Ideally, if I pick 5 days in Feb, I want 5 days in Jan.
  
  // If I just subtract 1 month from Start and End:
  // Jan 15 - Jan 20 (5 days) -> Dec 15 - Dec 20 (5 days). Perfect.
  // Mar 31 - Mar 31 (1 day) -> Feb 28 - Feb 28 (1 day). Perfect.
  
  return { start: prevStart, end: prevEnd };
};

/**
 * Formats a Date object to YYYY-MM-DD string for Supabase queries.
 */
export const formatDateForDB = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const defaultDateRange: { from: Date, to: Date } = {
  from: subDays(new Date(), 30),
  to: new Date()
};
