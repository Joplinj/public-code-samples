/**
 * Backtest Utility Functions
 *
 * Collection of helper functions used by the backtest service
 *
 * Responsibilities:
 * - Data transformation (formatPair, groupByMonth)
 * - Strategy parameter extraction (extractRanges)
 * - Combination logic for parameter optimization
 * - Backtest result validation
 * - Capital evolution computation
 */

function groupByMonth(evolutionArray) {
  const grouped = {};

  for (const entry of evolutionArray) {
    const { mois, ...rest } = entry;
    if (!grouped[mois]) grouped[mois] = { mois };
    Object.assign(grouped[mois], rest);
  }

  return Object.values(grouped);
}

// Format a trading pair depending market type
function formatPair(strategy) {
  return strategy.pair.replace("/", "").replace("USDT", strategy.type === "inverse" ? "USD" : "USDT");
}

/**
 * Extracts all parameter ranges defined in the strategy configuration.
 *
 * Used to generate multiple backtests when the user specifies value ranges
 * for indicators (ex RSI from 20 to 30)
 */

function extractRanges(strategyBase) {
  const blockTypes = ["openConditions", "closeConditions", "reloadConditions"];
  let results = [];

  blockTypes.forEach((blockType) => {
    const conditionBlocks = strategyBase.config[blockType] || [];
    conditionBlocks.forEach((block, blockIndex) => {
      block.conditions.forEach((cond, conditionIndex) => {
        const hasRange = cond.range1 !== undefined && cond.range2 !== undefined && (cond.range1 !== 0 || cond.range2 !== 0);
        if (hasRange) {
          results.push({
            blockType,
            blockIndex,
            conditionIndex,
            start: Math.min(parseInt(cond.range1), parseInt(cond.range2)),
            end: Math.max(parseInt(cond.range1), parseInt(cond.range2)),
          });
        }
      });
    });
  });
  return results;
}

/**
 * Generates all combinations of parameter values from extracted ranges
 * @param {Array} ranges
 * @param {Array} prefix
 * @param {number} index
 * @returns {Array<Array<number>>}
 */

function generateCombinations(ranges, prefix = [], index = 0) {
  if (index === ranges.length) return [prefix];
  const current = ranges[index];
  const combinations = [];
  for (let val = current.start; val <= current.end; val++) {
    combinations.push(...generateCombinations(ranges, [...prefix, val], index + 1));
  }
  return combinations;
}

function validateBacktestResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Backtest result is not an object");
  }

  if (typeof result.finalCapital !== "number") {
    throw new Error("Backtest result.finalCapital must be a number");
  }

  if (!Array.isArray(result.positions)) {
    throw new Error("Backtest result.positions must be an array");
  }
}

/**
 * Computes monthly capital evolution based on positions
 *
 * For each month:
 * - Aggregates profit/loss
 * - Update total capital
 * - Compute percentage change from previous month
 *
 *  @param {string} testKey - identifier for the backtest variant (default if no range)
 *  @param {Array} positions - [{ closeDate, profitLoss, entryFees }]
 *  @returns {Array} [{ mois, [testKey], [testKeyPercent] }]
 */

function calculateCapitalEvolutionSingle(testKey, positions) {
  if (!Array.isArray(positions) || positions.length === 0) return [];

  const sorted = [...positions].sort((a, b) => new Date(a.closeDate) - new Date(b.closeDate));
  const startDate = new Date(sorted[0].closeDate);
  const endDate = new Date(sorted[sorted.length - 1].closeDate);

  // Generate all months between first and last trade
  const allMonths = [];
  for (let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1); d <= endDate; d.setMonth(d.getMonth() + 1)) {
    allMonths.push(`${d.getMonth() + 1}/${d.getFullYear() % 100}`);
  }

  const initialCapital = 1000;
  let currentCapital = initialCapital;
  let lastMonthCapital = initialCapital;

  const evolution = [];

  for (const month of allMonths) {
    const monthPositions = positions.filter((pos) => {
      const posMonth = `${new Date(pos.closeDate).getMonth() + 1}/${new Date(pos.closeDate).getFullYear() % 100}`;
      return posMonth === month;
    });

    const totalPL = monthPositions.reduce((acc, cur) => acc + cur.profitLoss - (cur.entryFees || 0), 0);
    currentCapital += totalPL;
    const percentChange = ((currentCapital - lastMonthCapital) / lastMonthCapital) * 100;

    evolution.push({
      mois: month,
      [testKey]: parseFloat(currentCapital.toFixed(2)),
      [`${testKey}Percent`]: parseFloat(percentChange.toFixed(2)),
    });

    lastMonthCapital = currentCapital;
  }

  return evolution;
}

module.exports = { groupByMonth, formatPair, extractRanges, generateCombinations, validateBacktestResult, calculateCapitalEvolutionSingle };
