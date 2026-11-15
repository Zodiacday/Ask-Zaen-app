import { databaseHealth } from '../src/lib/server/public-media';

const health = databaseHealth();
console.log(JSON.stringify(health, null, 2));

const valid = health.schemaVersion === 2
  && health.rowCount === health.expectedRowCount
  && health.ftsCount === health.rowCount
  && health.highCount === 0
  && health.orphanEpisodes === 0
  && health.integrity === 'ok'
  && health.foreignKeyErrors === 0;

if (!valid) process.exitCode = 1;

