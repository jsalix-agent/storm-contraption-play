import { LEVELS } from './chapters-content.mjs?v=storm-campaign-public-20261001-v1';
import { restoreSave } from './chapters-state.mjs?v=storm-campaign-public-20261001-v1';

export const CAMPAIGN_SAVE_KEY = 'storm-contraption-campaign-save-v1-world3';
export const CAMPAIGN_RECORD_KEY = 'storm-contraption-campaign-records-v1-world3';
export const CAMPAIGN_PREF_KEY = 'storm-contraption-campaign-prefs-v1';
const IDS = LEVELS.map(level => level.id);
// Reuse lab validation, but only actual recovery may downgrade live eligibility.
const validSnapshot = snapshot => restoreSave(snapshot).status === 'restored';
const unlockedSnapshot = (campaign,snapshot) => IDS.indexOf(snapshot.levelId) <= campaign.completed.length;
const filedSnapshot = (campaign,snapshot) => !snapshot.run.finished ||
  (snapshot.run.elapsedMs > 0 && campaign.completed.includes(snapshot.levelId));
const validCampaign = campaign => campaign !== null && typeof campaign === 'object' &&
  !Array.isArray(campaign) && Object.keys(campaign).length === 4 &&
  ['v','worldVersion','completed','flight'].every(key => Object.hasOwn(campaign,key)) &&
  campaign.v === 1 && campaign.worldVersion === 3 && Array.isArray(campaign.completed) &&
  campaign.completed.length <= IDS.length &&
  IDS.slice(0,campaign.completed.length).every((id,i) => campaign.completed[i] === id) &&
  (campaign.flight === null || (validSnapshot(campaign.flight) && unlockedSnapshot(campaign,campaign.flight) &&
    filedSnapshot(campaign,campaign.flight)));
function requireCampaign(campaign) {
  if (!validCampaign(campaign)) throw new TypeError('Invalid campaign');
}

function copySnapshot(snapshot, {practice = false} = {}) {
  const restored = restoreSave(snapshot);
  if (!practice) restored.run.eligible = snapshot.run.eligible;
  return {v:1,levelId:restored.levelId,checkpoint:restored.checkpoint,run:restored.run};
}

export function createCampaign() {
  return {v:1,worldVersion:3,completed:[],flight:null};
}

export function restoreCampaign(parsed) {
  if (parsed === undefined) return {status:'new',campaign:createCampaign()};
  if (!validCampaign(parsed)) return {status:'invalid',campaign:createCampaign()};
  const flight = parsed.flight === null ? null : copySnapshot(parsed.flight,{practice:true});
  return {status:'restored',campaign:{...createCampaign(),completed:[...parsed.completed],flight}};
}

export function unlockedLevels(campaign) {
  requireCampaign(campaign);
  return IDS.slice(0,Math.min(IDS.length,campaign.completed.length + 1));
}

export function nextFlight(campaign) {
  requireCampaign(campaign);
  return IDS[campaign.completed.length] ?? null;
}

export function fileFlight(campaign, snapshot) {
  requireCampaign(campaign);
  if (!validSnapshot(snapshot) || !unlockedSnapshot(campaign,snapshot) ||
      !snapshot.run.finished || snapshot.run.elapsedMs <= 0)
    throw new TypeError('Invalid campaign completion');
  const completed = [...campaign.completed];
  if (snapshot.levelId === nextFlight(campaign)) completed.push(snapshot.levelId);
  return attachFlight({...campaign,completed},snapshot);
}

export function attachFlight(campaign, snapshot) {
  requireCampaign(campaign);
  if (!validSnapshot(snapshot)) throw new TypeError('Invalid campaign snapshot');
  if (!unlockedSnapshot(campaign,snapshot)) throw new TypeError('Locked campaign flight');
  if (!filedSnapshot(campaign,snapshot)) throw new TypeError('Unfiled campaign completion');
  return {...createCampaign(),completed:[...campaign.completed],flight:copySnapshot(snapshot)};
}
