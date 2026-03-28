const { fetchDataFromAPI } = require("..");
const { backtestGroup } = require("..");
const { updateTask, getTask, deleteTask } = require("../utils/taskManager");
const {
  groupByMonth,
  formatPair,
  extractRanges,
  generateCombinations,
  validateBacktestResult,
  calculateCapitalEvolutionSingle,
} = require("../utils/backtestUtils");

// Actually, this app is for a single user, store mutliple lastHistoryData not needed
let lastHistoryData = [];

// In case of range backtest, we need to allow a maximum of backtests to preserve RAM and CPU
const MAX_COMBINATIONS = 500;

/**
 * Performs a backtest for a strategy
 *
 * Supports both:
 * - standard backtest execution
 * - parameter range optimization (multiple generated combinations)
 *
 * On completion, the task is updated with:
 * - status
 * - summarized results (positions)
 * - monthly capital evolution
 *
 * @param {object} strategy
 * @param {string} taskId
 * @param {string} user
 * @param {number} monthToBacktest
 * @param {boolean} isSameDataAndIndicators
 */

async function startBacktestGroup(strategy, taskId, user, monthToBacktest, isSameDataAndIndicators) {
  console.log("Starting backtest process");

  const market = strategy.market;
  try {
    const formattedPair = formatPair(strategy);

    // Re use cached history data when requested, otherwise fetch fresh data
    let dataToTest = lastHistoryData;

    if (!isSameDataAndIndicators) {
      dataToTest = await fetchDataFromAPI(formattedPair, strategy.config, strategy.type, market, user, monthToBacktest);

      if (dataToTest === "error") {
        throw new Error("Failed to fetch market data");
      }
    }

    const strategyBase = { ...strategy, name: formattedPair, candles: [...dataToTest] };

    lastHistoryData = [...dataToTest];

    // Detect parameter ranges defined in the strategy configuration
    const rangesToTest = extractRanges(strategyBase);

    let backtestResults = [];
    let capitalEvolutionArray = [];

    // Range found then multiple backtests for each value
    if (rangesToTest.length > 0) {
      const allCombinations = generateCombinations(rangesToTest);

      if (allCombinations.length > MAX_COMBINATIONS) {
        throw new Error("Too many parameter combinations");
      }

      for (const values of allCombinations) {
        // Clone strategy to avoid mutation between parameter combinations
        const strategyCopy = JSON.parse(JSON.stringify(strategyBase));

        values.forEach((val, i) => {
          const target = rangesToTest[i];
          const condition = strategyCopy.config[target.blockType][target.blockIndex].conditions[target.conditionIndex];

          if (condition.indicator === "bollingerbands") {
            condition.intensity = val;
          } else if (["rsi", "stochrsi", "profitloss"].includes(condition.indicator)) {
            condition.value = val;
          }
        });

        const result = backtestGroup(strategyCopy, market);

        validateBacktestResult(result);

        const testKey = values ? values.join("-") : "default";

        const evolution = calculateCapitalEvolutionSingle(testKey, result.positions);
        capitalEvolutionArray.push(...evolution);

        // Memory clean because positions of each case of range will not be showed to user, only general results
        result.positions = [];
        backtestResults.push({ testValues: values || [], result });
      }
    } else {
      const result = backtestGroup(strategyBase, market);

      validateBacktestResult(result);

      const testKey = "default";

      const evolution = calculateCapitalEvolutionSingle(testKey, result.positions || []);
      capitalEvolutionArray.push(...evolution);

      backtestResults.push({ testValues: [], result });
    }

    const finalCapitalEvolution = groupByMonth(capitalEvolutionArray);

    updateTask(taskId, { status: "done", result: backtestResults[0].result, capitalEvolution: finalCapitalEvolution });

    // Cleanup
    setTimeout(() => {
      const task = getTask(taskId);
      if (task?.status === "done") {
        deleteTask(taskId);
      }
    }, 180000);
  } catch (error) {
    console.error("Backtest group failed:", error);
    updateTask(taskId, { status: "error", error: error.message || "Backtest execution failed" });
  }
}

module.exports = { startBacktestGroup };
