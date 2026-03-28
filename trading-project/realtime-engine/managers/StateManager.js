const { getTradeRecord, updateTradeRecord, createTradeRecord } = require("../database/trades");
const { addErrorInDB } = require("../database/errors");
const { PlatformFactory } = require("../platforms/PlatformFactory");

/**
 * Manages the runtime trading state for a single account.
 *
 * Responsibilities:
 * - keep local position state synchronized with the trading platform
 * - preserve application-specific position metadata between refresh cycles
 * - coordinate order execution and state updates
 * - expose a single source of truth for account-level trading state
 */
class StateManager {
  constructor({ isTestnet, apiKey, apiSecret, passphrase, metaApiID, metaApiAuthToken, platform, WSurlPublic, accountId }) {
    this.accountId = accountId;
    this.platform = platform;
    this.isTestnet = isTestnet;
    this.WSurlPublic = WSurlPublic;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
    this.metaApiID = metaApiID;
    this.metaApiAuthToken = metaApiAuthToken;

    this.isStateReady = false;
    this.isClosingRequested = false;

    this.walletBalance = [];
    this.globalPositions = {};

    this.positionUpdateIntervalId = null;

    this.isPositionOpen = false;
    this.positionLock = false;
    this.platformInstance = PlatformFactory.create(platform, {
      apiKey: apiKey,
      apiSecret: apiSecret,
      passphrase: passphrase,
      metaApiID: metaApiID,
      metaApiAuthToken: metaApiAuthToken,
      accountId: accountId,
    });
  }

  /**
   * Acquires a lightweight async lock used to serialize critical state mutations.
   *
   * This prevents race conditions between:
   * - order execution
   * - periodic position refresh
   * - local position state updates
   */
  async acquireLock() {
    while (this.positionLock) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    this.positionLock = true;
  }

  releaseLock() {
    this.positionLock = false;
  }

  /**
   * Persists a trade state transition in the database to prevent state loss
   * across disconnections, restarts, and reconnections.
   *
   * "open" creates a new trade record.
   * Other supported actions update an existing record.
   */
  async _saveTradeInDB(symbol, type, action) {
    try {
      if (action === "open") await createTradeRecord(symbol, type, this.accountId);
      else await updateTradeRecord(symbol, action, this.accountId);
    } catch (error) {
      console.error("Failed to persist trade record", error);
      throw error;
    }
  }

  async _getWalletOnStart() {
    try {
      const response = await this.platformInstance.getWalletBalance();
      if (!response) return false;

      this.walletBalance = response;
      return true;
    } catch (error) {
      console.error("Failed to initialize wallet balance", error);
      return false;
    }
  }

  /**
   * Initializes in-memory positions from the platform state at startup.
   *
   * Existing platform positions are enriched with application-specific data
   * stored in the database, such as reload counters and candle streaks.
   */
  async _getPositionsOnStart() {
    try {
      const positions = await this._fetchPositionsFromAPI();
      if (!positions) return false;

      for (const position of positions) {
        const symbol = position.symbol;

        const savedTradeData = await getTradeRecord(symbol, this.accountId);

        if (savedTradeData) {
          this.globalPositions[symbol] = {
            ...position,
            reloadCount: savedTradeData.reloadCount,
            positiveCandles: savedTradeData.positiveCandles,
            negativeCandles: savedTradeData.negativeCandles,
          };
        } else {
          const newType = symbol.includes("USDT") || this.platform === "forex" ? "linear" : "inverse";
          await this._saveTradeInDB(symbol, newType, "open");

          this.globalPositions[symbol] = {
            ...position,
            reloadCount: 0,
            positiveCandles: createDefaultCandleCounters(),
            negativeCandles: createDefaultCandleCounters(),
          };
        }
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize positions from platform state", error);
      return false;
    }
  }

  /**
   * Executes an order action and updates the local account state accordingly.
   *
   * Supported actions:
   * - open
   * - reload
   * - close
   *
   * The method is protected by a lock to avoid concurrent state mutations
   * while an order is being processed.
   */
  async executeOrderAction({ pair, type, side, leverage, rpt, closePrice, action, instrumentInfos, RSI = null }) {
    await this.acquireLock();

    try {
      if (
        !this.isStateReady ||
        (action === "open" && this.isPositionOpen) ||
        ((action === "close" || action === "reload") && !this.isPositionOpen)
      ) {
        return false;
      }

      const position = this.globalPositions[pair];

      let response = false;
      if (action === "open" || action === "reload") {
        response = await this.platformInstance.openPosition(
          action,
          pair,
          type,
          side,
          leverage,
          rpt,
          closePrice,
          instrumentInfos,
          position,
          this.accountId,
          RSI,
        );
      } else if (action === "close") {
        response = await this.platformInstance.closePosition(
          action,
          pair,
          type,
          side,
          leverage,
          rpt,
          closePrice,
          instrumentInfos,
          position,
          this.accountId,
        );
      } else {
        throw new Error(`Unsupported action: ${action}`);
      }

      if (response) {
        await this._saveTradeInDB(pair, type, action);
        if (action === "open") this.isPositionOpen = true;
        else if (action === "close") this.isPositionOpen = false;
        else if (action === "reload" && position) position.reloadCount += 1;
        return true;
      } else {
        console.error("Failed to execute order");
        return false;
      }
    } catch (error) {
      console.error("Failed to execute position", action, error);
      await addErrorInDB("executeOrderAction", error, "", this.accountId);
      return false;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Initializes the state manager and starts periodic position synchronization.
   *
   * Startup fails if either the initial positions or wallet balance
   * cannot be loaded successfully.
   */
  async start() {
    this.positionLock = false;
    this.isStateReady = false;

    this.close();
    this.isClosingRequested = false;

    const isGetPositionsDone = await this._getPositionsOnStart();
    const isGetWalletDone = await this._getWalletOnStart();

    if (!isGetPositionsDone || !isGetWalletDone) {
      throw new Error("Failed to initialize StateManager");
    }
    this._startPositionUpdate();
    this.isStateReady = true;
  }

  async _fetchPositionsFromAPI() {
    const response = await this.platformInstance.getPositions();

    // Errors are intentionally propagated to the caller.
    if (!response) return false;

    this.isPositionOpen = response.length > 0;
    return response;
  }

  /**
   * Refreshes in-memory positions from the latest platform state.
   *
   * Platform fields are updated from the API response, while local metadata
   * such as reload counters and candle streaks are preserved.
   *
   * Note: Only one position per symbol is supported
   */
  async _getPositions() {
    await this.acquireLock();
    try {
      const positions = await this._fetchPositionsFromAPI();
      if (!positions) return;

      const updatedPositions = {};

      for (const position of positions) {
        const symbol = position.symbol;

        if (this.globalPositions[symbol]) {
          const existingPosition = this.globalPositions[symbol];
          updatedPositions[symbol] = {
            ...existingPosition,
            size: position.size,
            entryPrice: position.entryPrice,
            side: position.side,
          };
        } else {
          updatedPositions[symbol] = {
            ...position,
            reloadCount: 0,
            positiveCandles: createDefaultCandleCounters(),
            negativeCandles: createDefaultCandleCounters(),
          };
        }
      }

      this.globalPositions = updatedPositions;
    } catch (error) {
      console.error("Failed to refresh positions from platform API", error);
    } finally {
      this.releaseLock();
    }
  }

  _startPositionUpdate() {
    this.positionUpdateIntervalId = setInterval(async () => {
      if (this.isStateReady) {
        this._getPositions();
      }
    }, 3000);
  }

  _stopPositionUpdate() {
    if (this.positionUpdateIntervalId) {
      clearInterval(this.positionUpdateIntervalId);
      this.positionUpdateIntervalId = null;
    }
  }

  close() {
    this.isClosingRequested = true;
    this._stopPositionUpdate();
    this.isStateReady = false;
  }
}

const createDefaultCandleCounters = () => {
  return {
    5: 0,
    15: 0,
    30: 0,
    60: 0,
    120: 0,
    240: 0,
  };
};

module.exports = StateManager;
