import { useCallback, useEffect, useRef, useState } from "react";
import { calculateAverageTradeDurationInHours } from "../utils/backtestResults";

/**
 * Handles asynchronous backtest execution and task-status polling.
 *
 * Exposes the current task state, processed results, and a function used
 * to start a new backtest request.
 */
export function useBacktestTask(apiBaseUrl) {
  const shouldContinuePolling = useRef(true);

  const [loading, setLoading] = useState(false);
  const [backtestProgression, setBacktestProgression] = useState("");
  const [results, setResults] = useState([]);
  const [finalCapital, setFinalCapital] = useState(1000);
  const [capitalEvolution, setCapitalEvolution] = useState([
    { month: "Start", linear: 1000, linearPercent: 0 },
  ]);
  const [averageDurationHours, setAverageDurationHours] = useState(0);

  useEffect(() => {
    return () => {
      shouldContinuePolling.current = false;
    };
  }, []);

  const checkTaskStatus = useCallback(
    async (taskId) => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/backtest/task-status/${taskId}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.status === "pending" && shouldContinuePolling.current) {
          setBacktestProgression("Processing");

          setTimeout(() => {
            checkTaskStatus(taskId);
          }, 2000);

          return;
        }

        if (data.status === "error") {
          setBacktestProgression("Error");
          setLoading(false);
          return;
        }

        if (data.status === "done") {
          const positions = data.result?.positions ?? [];
          const nextFinalCapital = data.result?.finalCapital ?? 0;

          setBacktestProgression("Done");
          setResults(positions);
          setFinalCapital(nextFinalCapital);
          setAverageDurationHours(calculateAverageTradeDurationInHours(positions));
          setCapitalEvolution(data.capitalEvolution ?? []);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to check backtest task status", error);
        setBacktestProgression("Error");
        setLoading(false);
      }
    },
    [apiBaseUrl],
  );

  const startBacktest = useCallback(
    async ({ strategies, user, monthToBacktest, isSameDataAndIndicators }) => {
      try {
        setBacktestProgression("");
        setLoading(true);

        const response = await fetch(`${apiBaseUrl}/api/backtest/start_backtest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=utf-8",
          },
          body: JSON.stringify({
            strategies,
            user,
            monthToBacktest,
            isSameDataAndIndicators,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const taskId = await response.json();

        if (!taskId) {
          throw new Error("Backtest task creation failed");
        }

        checkTaskStatus(taskId);
      } catch (error) {
        console.error("Failed to start backtest", error);
        setBacktestProgression("Error");
        setLoading(false);
      }
    },
    [apiBaseUrl, checkTaskStatus],
  );

  return {
    loading,
    backtestProgression,
    results,
    finalCapital,
    capitalEvolution,
    averageDurationHours,
    startBacktest,
  };
}