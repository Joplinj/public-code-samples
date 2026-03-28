/**
 * Task Manager
 *
 * Simple in-memory task store used to track asynchronous backtest execution.
 *
 * Limitations:
 * - Stored in memory (lost on server restart)
 * - Not suitable for multi-instance or distributed environments
 * - No persistence or expiration strategy (except manual delete)
 */

const { v4: uuidv4 } = require("uuid");

const tasks = {};

function createTask() {
  const id = uuidv4();
  tasks[id] = { status: "pending", createdAt: Date.now() };
  return id;
}

function getTask(id) {
  if (!tasks[id]) throw new Error(`Task ${id} not found`);
  return tasks[id];
}

function updateTask(id, data) {
  if (!tasks[id]) throw new Error(`Task ${id} not found`);
  tasks[id] = { ...tasks[id], ...data };
}

function deleteTask(id) {
  if (!tasks[id]) throw new Error(`Task ${id} not found`);
  delete tasks[id];
}

module.exports = { createTask, getTask, updateTask, deleteTask };
