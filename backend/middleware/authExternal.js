const ApiClient = require('../models/ApiClient');

const authExternal = (requiredPermission) => async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'API Key is required in x-api-key header' });
    }

    const client = await ApiClient.findOne({ apiKey, isActive: true });
    if (!client) {
      return res.status(401).json({ success: false, message: 'Invalid or inactive API Key' });
    }

    // Check permissions
    if (requiredPermission && !client.permissions.includes(requiredPermission)) {
      return res.status(403).json({ success: false, message: `Insufficient permissions. Required: ${requiredPermission}` });
    }

    req.apiClient = client;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Authorization error', error: err.message });
  }
};

module.exports = authExternal;
