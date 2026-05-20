import { describe, expect, it } from 'vitest';

import {
  planSituationPromptInsert,
  reconcileSituationBodyChange,
  type SituationComposerState,
} from './situation-compose-state';
import { getSituationPrompt, situationPrompts } from './situation-prompts';

const emptyComposer: SituationComposerState = {
  body: '',
  generatedSituationBody: '',
  generatedSituationTitle: '',
  situationIds: [],
  title: '',
};

describe('situation composer state', () => {
  it('does not resurrect old stickers after the generated body is replaced', () => {
    const hardConversation = requiredPrompt('relationship_conflict');
    const reconciliation = requiredPrompt('relationship_repair');
    const quietMind = requiredPrompt('overthinking');

    const firstInsert = planSituationPromptInsert(emptyComposer, hardConversation, situationPrompts);
    const secondInsert = planSituationPromptInsert(firstInsert, reconciliation, situationPrompts);
    const manuallyEdited = reconcileSituationBodyChange(secondInsert, 'Please pray for this new thing.');
    const nextInsert = planSituationPromptInsert(manuallyEdited, quietMind, situationPrompts);

    expect(manuallyEdited.situationIds).toEqual([]);
    expect(manuallyEdited.title).toBe('');
    expect(nextInsert.title).toBe(quietMind.title);
    expect(nextInsert.body).toContain(quietMind.phrase);
    expect(nextInsert.body).not.toContain(hardConversation.phrase);
    expect(nextInsert.body).not.toContain(reconciliation.phrase);
  });

  it('keeps extending the active generated sticker block when it still exists', () => {
    const hardConversation = requiredPrompt('relationship_conflict');
    const reconciliation = requiredPrompt('relationship_repair');

    const firstInsert = planSituationPromptInsert(emptyComposer, hardConversation, situationPrompts);
    const withCustomNote = reconcileSituationBodyChange(
      firstInsert,
      `${firstInsert.body}\n\nI also want to keep this note.`,
    );
    const secondInsert = planSituationPromptInsert(withCustomNote, reconciliation, situationPrompts);

    expect(secondInsert.situationIds).toEqual([hardConversation.id, reconciliation.id]);
    expect(secondInsert.body).toContain(hardConversation.phrase);
    expect(secondInsert.body).toContain(reconciliation.phrase);
    expect(secondInsert.body).toContain('I also want to keep this note.');
  });
});

function requiredPrompt(id: string) {
  const prompt = getSituationPrompt(id);

  if (!prompt) {
    throw new Error(`Missing test prompt: ${id}`);
  }

  return prompt;
}
