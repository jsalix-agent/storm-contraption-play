import { CHAPTERS, LEVELS } from './chapters-content.mjs?v=storm-campaign-public-20261001-v1';
import { nextFlight, unlockedLevels } from './campaign-state.mjs?v=storm-campaign-public-20261001-v1';

export function overview(campaign, records, selectedId, activeLevelId = null, activeFinished = false) {
  const unlocked = unlockedLevels(campaign);
  const currentId = nextFlight(campaign);
  if (!unlocked.includes(selectedId)) {
    selectedId = unlocked.includes(activeLevelId) && !activeFinished ? activeLevelId : currentId ?? LEVELS.at(-1).id;
  }
  const level = LEVELS.find(level => level.id === selectedId);
  const record = records.levels[selectedId];
  const nodes = LEVELS.map((level, index) => {
    const chapterNumber = CHAPTERS.findIndex(chapter => chapter.id === level.chapterId) + 1;
    return {
      id: level.id,
      chapterId: level.chapterId,
      number: index + 1,
      chapterNumber,
      positionInChapter: CHAPTERS[chapterNumber - 1].levelIds.indexOf(level.id) + 1,
      unlocked: unlocked.includes(level.id),
      filed: campaign.completed.includes(level.id),
      current: level.id === currentId,
      selected: level.id === selectedId,
      title: unlocked.includes(level.id) ? level.title : null,
    };
  });
  return {
    selectedId,
    completedCount: campaign.completed.length,
    patentCount: LEVELS.filter(level => records.levels[level.id].collected).length,
    nodes,
    detail: {
      id: level.id,
      chapterId: level.chapterId,
      title: level.title,
      premise: level.premise,
      patentTitle: record.collected ? level.patent.title : null,
      filed: campaign.completed.includes(selectedId),
      collected: record.collected,
      allPatents: record.allPatents,
      clean: record.clean,
      bestMs: record.bestMs,
      resumable: selectedId === activeLevelId && !activeFinished,
      finishedActive: selectedId === activeLevelId && activeFinished,
      world: level.world,
    },
  };
}
