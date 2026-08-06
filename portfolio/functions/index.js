const { setGlobalOptions } = require('firebase-functions/v2');

setGlobalOptions({
  maxInstances: 10,
  region: 'us-central1',
});

module.exports = {
  ...require('./src/admin'),
  ...require('./src/messages'),
  ...require('./src/registerStream'),
  ...require('./src/readme/processProjectReadme'),
  ...require('./src/readme/registerWebhook'),
  ...require('./src/readme/githubWebhook'),
  ...require('./src/triggers/onProjectWritten'),
};
