const express = require('express');
const accessPermissions = require('./accessPermissions');
const assistants = require('./assistants');
const categories = require('./categories');
const adminAuth = require('./admin/auth');
const { adminUsersRouter, adminConfigRouter } = require('@librechat/api');
const { requireJwtAuth } = require('~/server/middleware');
const endpoints = require('./endpoints');

const adminUsers = express.Router();
adminUsers.use(requireJwtAuth, adminUsersRouter);

const adminConfig = express.Router();
adminConfig.use(requireJwtAuth, adminConfigRouter);
const staticRoute = require('./static');
const messages = require('./messages');
const memories = require('./memories');
const presets = require('./presets');
const prompts = require('./prompts');
const balance = require('./balance');
const actions = require('./actions');
const apiKeys = require('./apiKeys');
const banner = require('./banner');
const search = require('./search');
const models = require('./models');
const convos = require('./convos');
const config = require('./config');
const agents = require('./agents');
const roles = require('./roles');
const oauth = require('./oauth');
const files = require('./files');
const share = require('./share');
const tags = require('./tags');
const auth = require('./auth');
const keys = require('./keys');
const user = require('./user');
const mcp = require('./mcp');

module.exports = {
  mcp,
  auth,
  adminAuth,
  adminUsers,
  adminConfig,
  keys,
  apiKeys,
  user,
  tags,
  roles,
  oauth,
  files,
  share,
  banner,
  agents,
  convos,
  search,
  config,
  models,
  prompts,
  actions,
  presets,
  balance,
  messages,
  memories,
  endpoints,
  assistants,
  categories,
  staticRoute,
  accessPermissions,
};
