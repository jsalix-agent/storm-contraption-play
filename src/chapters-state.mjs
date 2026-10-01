import { LEVELS, levelById } from './chapters-content.mjs?v=storm-campaign-public-20261001-v1';

export const SAVE_KEY = 'storm-contraption-chapter-lab-save-v3';
export const RECORD_KEY = 'storm-contraption-chapter-lab-records-v3';
export const PREF_KEY = 'storm-contraption-chapter-lab-prefs-v1';

// Closed local metrics: at most a year of active flight and a million events.
const MAX_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_COUNT = 1_000_000;
const RUN_KEYS = ['levelId','elapsedMs','crashes','retries','collected','eligible','finished'];
const REPORT_KEYS = ['levelId','elapsedMs','crashes','retries','patents','eligible','complete','allPatents','clean'];
const RECORD_KEYS = ['complete','allPatents','clean','bestMs','bestAllMs','collected'];
const IDS = LEVELS.map(level => level.id);
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
const bounded = (n, max) => Number.isFinite(n) && n >= 0 && n <= max;
const count = n => Number.isInteger(n) && bounded(n,MAX_COUNT);
const positiveMs = n => bounded(n,MAX_MS) && n > 0;
const level = id => typeof id === 'string' && IDS.includes(id) ? levelById(id) : undefined;
const validRun = run => exact(run,RUN_KEYS) && !!level(run.levelId) && bounded(run.elapsedMs,MAX_MS) &&
  count(run.crashes) && count(run.retries) && Array.isArray(run.collected) &&
  (run.collected.length === 0 || (run.collected.length === 1 && run.collected[0] === run.levelId)) &&
  typeof run.eligible === 'boolean' && typeof run.finished === 'boolean';
const copyRun = run => ({levelId:run.levelId,elapsedMs:run.elapsedMs,crashes:run.crashes,retries:run.retries,
  collected:[...run.collected],eligible:run.eligible,finished:run.finished});
function requireRun(run) {
  if (!validRun(run)) throw new TypeError('Invalid chapter flight run');
}

export function createRun(levelId) {
  if (!level(levelId)) throw new TypeError('Unknown chapter flight');
  return {levelId,elapsedMs:0,crashes:0,retries:0,collected:[],eligible:true,finished:false};
}

export function tickRun(run, dt, {active = false} = {}) {
  requireRun(run);
  if (run.finished || !active || !Number.isFinite(dt) || dt <= 0) return;
  const elapsedMs = run.elapsedMs + dt * 1000;
  if (elapsedMs > MAX_MS) run.eligible = false;
  run.elapsedMs = Math.min(MAX_MS,elapsedMs);
}

// The caller counts a playing -> dead transition, not every dead frame.
export function crashRun(run) {
  requireRun(run);
  if (run.finished) return;
  if (run.crashes === MAX_COUNT) run.eligible = false;
  else run.crashes++;
}

export function retryRun(run, {manual = false} = {}) {
  requireRun(run);
  if (run.retries === MAX_COUNT) run.eligible = false;
  else run.retries++;
  if (manual || run.finished) { run.eligible = false; run.finished = false; }
}

export function collectPatent(run, patent, from, to) {
  if (!validRun(run) || run.finished || !patent || !from || !to ||
      from.mode !== 'playing' || from.awaitFlap || !['playing','ready','won'].includes(to.mode) ||
      ![from.x,from.y,to.x,to.y].every(Number.isFinite)) return [];
  const p = level(run.levelId).patent;
  // Never accept another flight's patent, or geometry supplied by a save/caller.
  if (!p || ['id','kind','title','x','y','radius'].some(key => patent[key] !== p[key]) ||
      run.collected.includes(p.id)) return [];
  const dx = to.x - from.x, dy = to.y - from.y;
  let dt = .05;
  if (Number.isFinite(from.elapsed) && Number.isFinite(to.elapsed)) {
    // Basket homing finishes with a <1.5px snap and resets engine elapsed time.
    dt = to.mode === 'ready' && to.awaitFlap ? .05 : to.elapsed - from.elapsed;
    if (dt <= 0 || dt > .050000001) return [];
  }
  // Match classic collection: 50ms physical steps, never reset/teleport sweeps.
  if (Math.hypot(dx,dy) > 1000 * dt + 2) return [];
  const t = Math.max(0,Math.min(1,((p.x-from.x)*dx + (p.y-from.y)*dy) / (dx*dx + dy*dy || 1)));
  if ((from.x+t*dx-p.x)**2 + (from.y+t*dy-p.y)**2 > (11+p.radius)**2) return [];
  run.collected = [p.id];
  return [p.id];
}

export function finishRun(run) {
  requireRun(run);
  run.finished = true;
  const patents = run.collected.length, eligible = run.eligible;
  return {levelId:run.levelId,elapsedMs:run.elapsedMs,crashes:run.crashes,retries:run.retries,patents,eligible,
    complete:eligible,allPatents:eligible && patents === 1,clean:eligible && run.crashes === 0 && run.retries === 0};
}

export function snapshotSave(levelId, game, run) {
  requireRun(run);
  const content = level(levelId);
  if (!content || run.levelId !== levelId || !game ||
      !content.world.checkpoints.some(p => p.id === game.checkpoint) ||
      (Object.hasOwn(game,'levelId') && game.levelId !== levelId) ||
      (Object.hasOwn(game,'world') && (!game.world ||
        ['seed','course','worldVersion'].some(key => game.world[key] !== content.world[key]))))
    throw new TypeError('Chapter snapshot identity or checkpoint mismatch');
  return {v:1,levelId,checkpoint:game.checkpoint,run:copyRun(run)};
}

export function restoreSave(parsed) {
  const fallback = status => ({status,levelId:'rain-1',checkpoint:'launch',run:createRun('rain-1')});
  if (parsed === undefined) return fallback('new');
  if (!exact(parsed,['v','levelId','checkpoint','run']) || parsed.v !== 1 ||
      !level(parsed.levelId) || !level(parsed.levelId).world.checkpoints.some(p => p.id === parsed.checkpoint) ||
      !validRun(parsed.run) || parsed.run.levelId !== parsed.levelId) return fallback('invalid');
  const run = copyRun(parsed.run);
  // The save contains a recovery well, never an exact mid-flight pose. Rewinding
  // any unfinished run (even to launch) makes its cumulative report practice-only.
  // Finished reports remain stable; the UI must not submit them again on reload.
  if (!run.finished) run.eligible = false;
  return {status:'restored',levelId:parsed.levelId,checkpoint:parsed.checkpoint,run};
}

export function createRecords() {
  return {v:1,levels:Object.fromEntries(IDS.map(id => [id,
    {complete:false,allPatents:false,clean:false,bestMs:null,bestAllMs:null,collected:false}]))};
}
const validLevelRecord = record => exact(record,RECORD_KEYS) &&
  ['complete','allPatents','clean','collected'].every(key => typeof record[key] === 'boolean') &&
  [record.bestMs,record.bestAllMs].every(n => n === null || positiveMs(n)) &&
  record.complete === (record.bestMs !== null) && record.allPatents === (record.bestAllMs !== null) &&
  (!record.clean || record.complete) &&
  (!record.allPatents || (record.complete && record.collected && record.bestMs <= record.bestAllMs));
const validRecords = records => exact(records,['v','levels']) && records.v === 1 &&
  exact(records.levels,IDS) && IDS.every(id => validLevelRecord(records.levels[id]));
const copyRecords = records => ({v:1,levels:Object.fromEntries(IDS.map(id => [id,{...records.levels[id]}]))});
function requireRecords(records) {
  if (!validRecords(records)) throw new TypeError('Invalid chapter records');
}

export function restoreRecords(parsed) {
  if (parsed === undefined) return {status:'new',records:createRecords()};
  const valid = validRecords(parsed);
  return {status:valid ? 'restored' : 'invalid',records:valid ? copyRecords(parsed) : createRecords()};
}

const validReport = report => exact(report,REPORT_KEYS) && !!level(report.levelId) &&
  positiveMs(report.elapsedMs) && count(report.crashes) && count(report.retries) &&
  Number.isInteger(report.patents) && report.patents >= 0 && report.patents <= 1 &&
  ['eligible','complete','allPatents','clean'].every(key => typeof report[key] === 'boolean') &&
  report.complete === report.eligible && report.allPatents === (report.eligible && report.patents === 1) &&
  report.clean === (report.eligible && report.crashes === 0 && report.retries === 0);

export function updateRecords(records, report) {
  requireRecords(records);
  const next = copyRecords(records);
  if (!validReport(report) || !report.eligible || !report.complete) return next;
  const entry = next.levels[report.levelId];
  entry.complete = true;
  entry.bestMs = entry.bestMs === null ? report.elapsedMs : Math.min(entry.bestMs,report.elapsedMs);
  if (report.allPatents) {
    entry.allPatents = true;
    entry.collected = true;
    entry.bestAllMs = entry.bestAllMs === null ? report.elapsedMs : Math.min(entry.bestAllMs,report.elapsedMs);
  }
  if (report.clean) entry.clean = true;
  return next;
}

export function noteCollection(records, levelId) {
  requireRecords(records);
  const next = copyRecords(records);
  if (level(levelId)) next.levels[levelId].collected = true;
  return next;
}
