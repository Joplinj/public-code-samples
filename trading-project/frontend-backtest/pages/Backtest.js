import { useEffect, useRef, useState } from "react";
import ChartResults from "..";
import BacktestForm from "..";
import BacktestStrategiesPanel from "..";
import BacktestControlPanel from "..";
import BacktestStats from "..";
import { useBacktestTask } from "../hooks/useBacktestTask";
import { RESULTS_PER_PAGE, formatResultDate } from "../utils/backtestResults";

/**
 * Backtest page used to configure strategy groups, launch asynchronous backtests,
 * and visualize execution results.
 *
 * This component keeps UI-specific state local, while task polling and result
 * processing are delegated to dedicated hooks and utilities.
 */
const Backtest = ({ user }) => {
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "";

  const { loading, backtestProgression, results, finalCapital, capitalEvolution, averageDurationHours, startBacktest } =
    useBacktestTask(apiBaseUrl);

  const [strategies, setStrategies] = useState([]);
  const [page, setPage] = useState(0);

  const [savedStrategiesIndex, setSavedStrategiesIndex] = useState([]);

  const [pairs, setPairs] = useState([]);
  const [forexPairs, setForexPairs] = useState([]);

  const [selectedMarket, setSelectedMarket] = useState("crypto");
  const [selectedPair, setSelectedPair] = useState("");

  const [strategyName, setStrategyName] = useState("");
  const [type, setType] = useState("linear");
  const [leverage, setLeverage] = useState(18);

  const [formExpanded, setFormExpanded] = useState(false);

  const [monthToBacktest, setMonthToBacktest] = useState(24);
  const [isSameDataAndIndicators, setIsSameDataAndIndicators] = useState(false);

  const [openConditions, setOpenConditions] = useState([
    {
      executionMode: "onCandleOpen",
      rpt: 10,
      side: "long",
      conditions: [
        {
          interval: 15,
          indicator: "rsi",
          operator: ">",
          value: 80,
          intensity: 0,
        },
      ],
    },
  ]);
  const [closeConditions, setCloseConditions] = useState([
    {
      executionMode: "onCandleOpen",
      rpt: 10,
      side: "long",
      conditions: [
        {
          interval: 15,
          indicator: "rsi",
          operator: ">",
          value: 80,
          intensity: 0,
        },
      ],
    },
  ]);
  const [reloadConditions, setReloadConditions] = useState([]);

  // Prevent market changes triggered during strategy editing
  // from resetting the form state.
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (isEditingRef.current) {
      isEditingRef.current = false;
      return;
    }

    const nextPair = selectedMarket === "crypto" ? pairs[0] : forexPairs[0];

    setSelectedPair(nextPair ?? "");
    setStrategies([]);
  }, [selectedMarket]);

  useEffect(() => {
    fetchFuturesInstruments();
    fetchForexInstruments();
  }, []);

  const fetchFuturesInstruments = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/assets/futures`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json;charset=utf-8",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const instruments = await response.json();
      const sortedInstruments = [...instruments].sort();

      setPairs(sortedInstruments);
      setSelectedPair(sortedInstruments[0] ?? "");
    } catch (error) {
      console.error("Failed to fetch futures instruments", error);
    }
  };

  const fetchForexInstruments = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/assets/forex`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json;charset=utf-8",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const instruments = await response.json();
      setForexPairs(instruments);
    } catch (error) {
      console.error("Failed to fetch forex instruments", error);
    }
  };

  const editStrategy = (strategyIndex) => {
    const currentStrategy = strategies[strategyIndex];
    if (!currentStrategy) return;

    isEditingRef.current = true;
    setFormExpanded(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setSavedStrategiesIndex([]);
    setStrategies((currentStrategies) => currentStrategies.filter((_, index) => index !== strategyIndex));

    setSelectedMarket(currentStrategy.market || "crypto");
    setSelectedPair(currentStrategy.pair);
    setStrategyName(currentStrategy.name);
    setType(currentStrategy.type);
    setLeverage(currentStrategy.leverage);
    setOpenConditions([...currentStrategy.config.openConditions]);
    setReloadConditions([...currentStrategy.config.reloadConditions]);
    setCloseConditions([...currentStrategy.config.closeConditions]);
  };

  const saveConfig = async (strategyIndex) => {
    if (savedStrategiesIndex.includes(strategyIndex)) return;

    const strategy = strategies[strategyIndex];
    if (!strategy) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/strategies/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=utf-8",
        },
        body: JSON.stringify({
          name: strategyName,
          market: strategy.market,
          pair: strategy.pair,
          type: strategy.type,
          leverage: strategy.leverage,
          config: strategy.config,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result === "ok") {
        setSavedStrategiesIndex((currentIndexes) => [...currentIndexes, strategyIndex]);
      }
    } catch (error) {
      console.error("Failed to save strategy configuration", error);
    }
  };

  const handleStartBacktest = () => {
    startBacktest({
      strategies,
      user,
      monthToBacktest,
      isSameDataAndIndicators,
    });
  };

  const paginatedResults = results.slice(page * RESULTS_PER_PAGE, (page + 1) * RESULTS_PER_PAGE);
  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE);

  return (
    <div className="backtest">
      <h1 className="backtest__title">Backtest</h1>

      <div className="backtest__layout">
        <div className="backtest__main">
          <BacktestForm
            setStrategies={setStrategies}
            strategies={strategies}
            loading={loading}
            pairs={pairs}
            forexPairs={forexPairs}
            selectedPair={selectedPair}
            setSelectedPair={setSelectedPair}
            strategyName={strategyName}
            setStrategyName={setStrategyName}
            type={type}
            setType={setType}
            leverage={leverage}
            setLeverage={setLeverage}
            formExpanded={formExpanded}
            setFormExpanded={setFormExpanded}
            selectedMarket={selectedMarket}
            setSelectedMarket={setSelectedMarket}
            openConditions={openConditions}
            setOpenConditions={setOpenConditions}
            closeConditions={closeConditions}
            setCloseConditions={setCloseConditions}
            reloadConditions={reloadConditions}
            setReloadConditions={setReloadConditions}
          />

          <BacktestStrategiesPanel
            loading={loading}
            setStrategies={setStrategies}
            strategies={strategies}
            editStrategy={editStrategy}
            savedStrategiesIndex={savedStrategiesIndex}
            setSavedStrategiesIndex={setSavedStrategiesIndex}
            saveConfig={saveConfig}
            pairs={pairs}
            forexPairs={forexPairs}
          />

          <ChartResults capitalEvolution={capitalEvolution} />
        </div>

        <div className="backtest__sidebar sticky">
          <BacktestControlPanel
            loading={loading}
            strategies={strategies}
            startBacktest={handleStartBacktest}
            backtestProgression={backtestProgression}
            monthToBacktest={monthToBacktest}
            setMonthToBacktest={setMonthToBacktest}
            isSameDataAndIndicators={isSameDataAndIndicators}
            setIsSameDataAndIndicators={setIsSameDataAndIndicators}
          />

          <BacktestStats finalCapital={finalCapital} results={results} averageDurationHours={averageDurationHours} />
        </div>
      </div>

      <div className="backtest__results">
        <h3 className="backtest__results-title">Trades Results</h3>

        <div className="backtest__table">
          <div className="backtest__table-header">
            <span>Pair</span>
            <span>P&amp;L</span>
            <span>Type</span>
            <span>Condition</span>
            <span>Size</span>
            <span>Open Price</span>
            <span>Close Price</span>
            <span>P. Reload</span>
            <span>L. Reload</span>
            <span>Fees</span>
            <span>Open Date</span>
            <span>Close Date</span>
          </div>

          <div className="backtest__table-body">
            {paginatedResults.map((position, index) => (
              <div key={index} className="backtest__table-row">
                <span className="pair">{position.name}</span>

                <span className={`profit-loss ${position.profitLoss > 0 ? "positive" : "negative"}`}>{position.profitLoss.toFixed(2)}</span>

                <span className="type">{position.side.charAt(0).toUpperCase() + position.side.slice(1)}</span>

                <span className="condition">{position.closeCondition}</span>
                <span className="size">${position.size.toFixed(2)}</span>
                <span className="price">{position.openPrice}</span>
                <span className="price">{position.closePrice}</span>
                <span className="reload">{position.profitReload}</span>
                <span className="reload">{position.lossReload}</span>
                <span className="fees">{position.entryFees.toFixed(2)}</span>
                <span className="date">{formatResultDate(position.date)}</span>
                <span className="date">{formatResultDate(position.closeDate)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="backtest__pagination">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button key={index} onClick={() => setPage(index)} className={`pagination-button ${page === index ? "active" : ""}`}>
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Backtest;
