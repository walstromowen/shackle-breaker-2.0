// shared/story/encounters/stageKit.js: the small pieces every encounter is built from, written once.
//   toStage(id)   outcomes that go straight on to stage `id`
//   next(id)      a lone "Continue." button that goes on to stage `id`
//   END           the result that ends the encounter
export const toStage = (stageId) => [{ weight: 100, results: [{ type: "ADVANCE_STAGE", payload: { stageId } }] }];
export const next = (stageId) => [{ text: "Continue.", outcomes: toStage(stageId) }];
export const END = { type: "END_ENCOUNTER", payload: null };
