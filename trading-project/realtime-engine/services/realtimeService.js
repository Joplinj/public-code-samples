const Account = require("../models/Account");
const Strategy = require("../models/Strategy");
const StateManager = require("../managers/StateManager");
const TradeManager = require("../managers/TradeManager");
const BitgetPublicConnection = require("../public_connections/BitgetPublicConnection");

// In-memory registry of active realtime runtimes by account.
let accountConnections = [];

function formatStrategiesPairName(strategies) {
  return strategies.map((item) => {
    const strategy = item._doc ?? item;
    const pair = strategy.type === "inverse" ? strategy.pair.replace("/", "").replace("USDT", "USD") : strategy.pair.replace("/", "");

    return {
      ...strategy,
      pair,
    };
  });
}

/**
 * Persists the realtime status of an account.
 *
 * When no strategies are provided, realtime execution is marked as stopped.
 * Otherwise, the account status is updated with the active strategy ids.
 */
async function saveStatusInDB(strategies, accountId) {
  try {
    const account = await Account.findById(accountId);
    if (!account) throw new Error("Account not found");

    if (!strategies || strategies.length === 0) {
      account.status.started = false;
      await account.save();
      return true;
    }

    const strategyIds = strategies.map((item) => item._id);

    account.status.started = true;
    account.status.strategies = strategyIds;

    await account.save();
    return true;
  } catch (error) {
    console.error("Failed to persist realtime account status", error);
    throw error;
  }
}

/**
 * Returns the persisted realtime status of an account along with
 * its associated formatted strategies.
 */
async function checkAccountStatus(accountId) {
  try {
    const account = await Account.findById(accountId);
    if (!account) throw new Error("Account not found");

    const status = account.status;
    const strategies = await Strategy.find({ _id: { $in: status.strategies } });
    const formattedStrategies = formatStrategiesPairName(strategies);

    return { started: status.started, strategies: formattedStrategies };
  } catch (error) {
    console.error("Failed to read account realtime status", error);
    throw error;
  }
}

/**
 * Restores realtime execution for accounts marked as started
 * in persisted account status.
 */
async function checkAndStart() {
  try {
    const accounts = await Account.find();

    for (const account of accounts) {
      const accountId = account._id.toString();
      const { status } = account;

      if (!status.started) continue;
      if (accountConnections.some((connection) => connection.accountId === accountId)) continue;

      const strategies = await Strategy.find({ _id: { $in: status.strategies } });
      if (strategies.length === 0) continue;

      const formattedStrategies = formatStrategiesPairName(strategies);
      await startRealtime(formattedStrategies, accountId);
    }
  } catch (error) {
    console.error("Failed to restore realtime execution on startup", error);
    throw error;
  }
}

/**
 * Starts realtime execution for a single account.
 *
 * If an active runtime session already exists for the account, it is stopped
 * and replaced with a newly initialized one.
 */
async function startRealtime(strategies, accountId) {
  const existingAccountConnection = accountConnections.find((item) => item.accountId === accountId);

  try {
    if (existingAccountConnection) {
      await Promise.all(existingAccountConnection.connections.map((connection) => connection.close()));

      if (existingAccountConnection.state) existingAccountConnection.state.close();

      accountConnections = accountConnections.filter((item) => item.accountId !== accountId);
    }

    const account = await Account.findById(accountId);
    if (!account) throw new Error("Account not found");

    const WSurlPublic = getPublicWsUrl(account);

    const accountRuntime = {
      accountId: accountId,
      connections: [],
      state: new StateManager({
        isTestnet: account.isTestnet,
        apiKey: account.apiKey,
        apiSecret: account.apiSecretKey,
        passphrase: account.passphrase,
        metaApiID: account.metaApiID,
        metaApiAuthToken: account.metaApiAuthToken,
        platform: account.platform,
        WSurlPublic,
        accountId: account._id,
      }),
    };

    await accountRuntime.state.start();

    for (const strategy of strategies) {
      const tradeManager = new TradeManager(strategy, accountRuntime.state);
      await tradeManager.initialize();

      const publicConnection = new BitgetPublicConnection(tradeManager);

      accountRuntime.connections.push(publicConnection);
      await publicConnection.start();
    }
    accountConnections.push(accountRuntime);
  } catch (error) {
    console.error("Failed to start realtime execution", error);
    throw error;
  }
}

/**
 * Resolves the public WebSocket endpoint for the configured platform.
 */
const getPublicWsUrl = (account) => {
  if (account.platform === "bitget") {
    return "wss://ws.bitget.com/v2/ws/public";
  }

  return "";
};

/**
 * Stops realtime execution for a single account and removes its runtime
 * from the in-memory connection registry.
 */
async function stopRealtime(accountId) {
  try {
    await saveStatusInDB(null, accountId);

    const accountRuntime = accountConnections.find((account) => account.accountId === accountId);
    if (!accountRuntime) return true;

    await Promise.all(accountRuntime.connections.map((connection) => connection.close()));

    accountRuntime.state.close();

    accountConnections = accountConnections.filter((item) => item.accountId !== accountId);

    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Stops all active realtime runtimes and clears the in-memory connection registry.
 */
async function stopAllRealtime() {
  await Promise.all(
    accountConnections.map(async (accountRuntime) => {
      await Promise.all(accountRuntime.connections.map((connection) => connection.close()));

      if (accountRuntime.state) {
        accountRuntime.state.close();
      }
    }),
  );

  accountConnections = [];
  return true;
}

/**
 * Gracefully shuts down all active realtime runtimes before terminating the process.
 */
const shutdown = async () => {
  console.log("Shutting down realtime service...");
  await stopAllRealtime();
  process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

/**
 * Returns the activity status of all realtime connections for an account.
 *
 * A connection is considered active if market data has been received
 * within the last 5 minutes.
 */
function getConnectionActivityStatus(accountId) {
  const accountRuntime = accountConnections.find((item) => item.accountId === accountId);
  if (!accountRuntime) return [];

  const now = Date.now();

  return accountRuntime.connections.map((connection) => {
    const lastTimeDataReceived = connection.lastTimeDataReceived ?? 0;
    const activityDeadline = lastTimeDataReceived + 5 * 60 * 1000;

    return {
      pair: connection.tradeManager.strategy.pair,
      isActive: activityDeadline > now,
    };
  });
}

module.exports = {
  formatStrategiesPairName,
  saveStatusInDB,
  checkAccountStatus,
  checkAndStart,
  startRealtime,
  stopRealtime,
  stopAllRealtime,
  getConnectionActivityStatus,
};
