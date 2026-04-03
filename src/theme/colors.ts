/**
 * Programmatic color palette for charts, category defaults, and dynamic styling.
 * These colors are designed to work in both light and dark mode.
 */

/** Vibrant palette for chart datasets and category colors */
export const CHART_COLORS = [
  '#6C5CE7', // purple
  '#00CEC9', // teal
  '#fd79a8', // coral pink
  '#FDCB6E', // amber
  '#00B894', // emerald
  '#E17055', // red-orange
  '#74B9FF', // sky blue
  '#A29BFE', // lavender
  '#55EFC4', // mint
  '#FF7675', // salmon
  '#FFEAA7', // pale yellow
  '#81ECEC', // light teal
] as const;

/** Default category colors — assigned when users create new categories */
export const CATEGORY_COLORS = [
  '#6C5CE7', // Groceries
  '#00CEC9', // Transport
  '#fd79a8', // Dining
  '#FDCB6E', // Entertainment
  '#00B894', // Health
  '#E17055', // Shopping
  '#74B9FF', // Bills
  '#A29BFE', // Education
  '#55EFC4', // Travel
  '#FF7675', // Gifts
] as const;

/** Get a chart color by index, cycling if needed */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** Budget health status colors */
export const HEALTH_COLORS = {
  green: '#00B894',
  yellow: '#FDCB6E',
  red: '#E17055',
} as const;
