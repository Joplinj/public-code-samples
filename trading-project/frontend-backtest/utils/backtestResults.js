export const RESULTS_PER_PAGE = 100;

export function calculateAverageTradeDurationInHours(trades) {
  if (!trades.length) return 0;

  const totalDurationInDays = trades.reduce((total, trade) => {
    const startDate = new Date(trade.date);
    const endDate = new Date(trade.closeDate);
    const durationInDays = (endDate - startDate) / (1000 * 60 * 60 * 24);

    return total + durationInDays;
  }, 0);

  return (totalDurationInDays / trades.length) * 24;
}

export function formatResultDate(date) {
  return new Date(date).toLocaleString("fr-FR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}