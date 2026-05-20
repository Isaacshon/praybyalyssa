import { buildSituationBody, type SituationPrompt } from './situation-prompts';

export type SituationComposerState = {
  body: string;
  generatedSituationBody: string;
  generatedSituationTitle: string;
  situationIds: string[];
  title: string;
};

export function planSituationPromptInsert(
  state: SituationComposerState,
  prompt: SituationPrompt,
  availablePrompts: SituationPrompt[],
): SituationComposerState {
  const currentBody = state.body.trim();
  const generatedBodyIsActive = Boolean(
    state.generatedSituationBody && currentBody.includes(state.generatedSituationBody),
  );
  const baseIds = generatedBodyIsActive ? state.situationIds : [];

  if (baseIds.includes(prompt.id) && currentBody) {
    return state;
  }

  const nextIds = [...baseIds, prompt.id];
  const selectedPrompts = nextIds
    .map((id) => availablePrompts.find((option) => option.id === id))
    .filter((option): option is SituationPrompt => Boolean(option));
  const nextGeneratedBody = buildSituationBody(selectedPrompts);
  const nextTitle =
    !state.title.trim() || state.title.trim() === state.generatedSituationTitle
      ? prompt.title
      : state.title;
  const nextBody = buildNextBody({
    currentBody,
    generatedBodyIsActive,
    nextGeneratedBody,
    previousGeneratedBody: state.generatedSituationBody,
  });

  return {
    body: nextBody,
    generatedSituationBody: nextGeneratedBody,
    generatedSituationTitle: nextTitle === prompt.title ? prompt.title : state.generatedSituationTitle,
    situationIds: nextIds,
    title: nextTitle,
  };
}

export function reconcileSituationBodyChange(
  state: SituationComposerState,
  nextBody: string,
): SituationComposerState {
  const trimmedBody = nextBody.trim();
  const generatedBodyIsActive = Boolean(
    state.generatedSituationBody && trimmedBody.includes(state.generatedSituationBody),
  );

  if (!trimmedBody || !generatedBodyIsActive) {
    return clearGeneratedSituationState(state, nextBody);
  }

  return {
    ...state,
    body: nextBody,
  };
}

function buildNextBody({
  currentBody,
  generatedBodyIsActive,
  nextGeneratedBody,
  previousGeneratedBody,
}: {
  currentBody: string;
  generatedBodyIsActive: boolean;
  nextGeneratedBody: string;
  previousGeneratedBody: string;
}) {
  if (!currentBody) {
    return nextGeneratedBody;
  }

  if (generatedBodyIsActive && previousGeneratedBody) {
    return currentBody.replace(previousGeneratedBody, nextGeneratedBody);
  }

  return `${currentBody}\n\n${nextGeneratedBody}`;
}

function clearGeneratedSituationState(
  state: SituationComposerState,
  nextBody: string,
): SituationComposerState {
  const titleWasGenerated =
    Boolean(state.generatedSituationTitle) && state.title.trim() === state.generatedSituationTitle;

  return {
    body: nextBody,
    generatedSituationBody: '',
    generatedSituationTitle: titleWasGenerated ? '' : state.generatedSituationTitle,
    situationIds: [],
    title: titleWasGenerated ? '' : state.title,
  };
}
