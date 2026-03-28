/**
 * Backtest Controller
 *
 * Handles HTTP endpoints for launching and tracking backtests.
 * Delegates execution to the backtest service and uses taskManager
 * to track asynchronous execution state.
 */

const { startBacktestGroup } = require("../services/backtestService");
const { createTask, updateTask, getTask, deleteTask } = require("../utils/taskManager");

const router = require("express").Router();

/**
 * POST /start_backtest
 *
 * Starts a backtest asynchronously and returns a taskId
 * The client can poll /task-status/:taskId to get progress and results
 */

router.post("/start_backtest", async (req, res) => {
  const { user, strategy, monthToBacktest, isSameDataAndIndicators } = req.body;

  // Validation
  const missingFields = [];
  if (!user) missingFields.push("user");
  if (!strategy) missingFields.push("strategy");

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: "Missing required parameters",
      missing: missingFields,
    });
  }

  // Initialize task
  const taskId = createTask();

  // Start backtest (async, non blocking)
  startBacktestGroup(strategy, taskId, user, monthToBacktest, isSameDataAndIndicators).catch((error) => {
    console.error("Backtest execution failed:", error);
    updateTask(taskId, { status: "error", error: error.message || "Backtest execution failed" });
  });

  return res.status(202).json(taskId);
});

/**
 * GET /task-status/:taskId
 *
 * Returns the current status of a backtest task
 * Possible status: pending | done | error
 */

router.get("/task-status/:taskId", (req, res) => {
  const { taskId } = req.params;
  const task = getTask(taskId);

  if (!task) return res.status(404).json({ error: "Task not found" });

  res.status(200).json({
    taskId,
    status: task.status,
    result: task.result || null,
    error: task.error || null,
    capitalEvolution: task.capitalEvolution || null,
  });
});

module.exports = router;
