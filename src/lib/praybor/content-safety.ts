import type { PrayerCard } from './sample-data';
import { ensureSupabaseProfile, getSupabaseRuntime, warnServerFallback } from './session';

export type PrayerReportReason =
  | 'harassment'
  | 'hate_or_abuse'
  | 'sexual_content'
  | 'violence_or_threat'
  | 'self_harm'
  | 'spam'
  | 'private_information'
  | 'other';

export type PrayerReportInsert = {
  prayer_id: string;
  reporter_id: string;
  reported_author_id: string | null;
  reason: PrayerReportReason;
  details: string | null;
  status: 'submitted';
};

export type PrayerSafetyControls = {
  hiddenPrayerIds: Set<string>;
  blockedAuthorIds: Set<string>;
};

export const REPORT_REASONS: { id: PrayerReportReason; label: string }[] = [
  { id: 'harassment', label: 'Harassment or targeting' },
  { id: 'hate_or_abuse', label: 'Hate or abusive language' },
  { id: 'sexual_content', label: 'Sexual content' },
  { id: 'violence_or_threat', label: 'Violence or threat' },
  { id: 'self_harm', label: 'Self-harm concern' },
  { id: 'spam', label: 'Spam or promotion' },
  { id: 'private_information', label: 'Private information' },
  { id: 'other', label: 'Something else' },
];

const profanityWords = [
  'badword',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'damn',
  '개새끼',
  '씨발',
  '병신',
  '좆',
  '꺼져',
];

export function maskProfanityInText(text: string) {
  return profanityWords.reduce((nextText, word) => {
    const expression = new RegExp(escapeRegex(word), 'giu');

    return nextText.replace(expression, (match) => maskProfanityWord(match));
  }, text);
}

export function maskProfanityWord(word: string) {
  const chars = Array.from(word);

  if (chars.length <= 1) {
    return '*';
  }

  return `${chars[0]}${'*'.repeat(chars.length - 1)}`;
}

export function applyPrayerVisibilityControls(
  cards: PrayerCard[],
  controls: PrayerSafetyControls,
) {
  return cards.filter((card) => {
    if (controls.hiddenPrayerIds.has(card.id)) {
      return false;
    }

    return !card.authorId || !controls.blockedAuthorIds.has(card.authorId);
  });
}

export function buildPrayerReportInsert({
  details,
  prayerId,
  reportedAuthorId,
  reporterId,
  reason,
}: {
  details?: string;
  prayerId: string;
  reportedAuthorId?: string | null;
  reporterId: string;
  reason: PrayerReportReason;
}): PrayerReportInsert {
  return {
    prayer_id: prayerId,
    reporter_id: reporterId,
    reported_author_id: reportedAuthorId ?? null,
    reason,
    details: details?.trim() ? details.trim() : null,
    status: 'submitted',
  };
}

export async function fetchPrayerSafetyControls(): Promise<PrayerSafetyControls> {
  const emptyControls = {
    hiddenPrayerIds: new Set<string>(),
    blockedAuthorIds: new Set<string>(),
  };
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return emptyControls;
  }

  try {
    await ensureSupabaseProfile();

    const [reportsResult, blocksResult] = await Promise.all([
      supabase.from('prayer_reports').select('prayer_id'),
      supabase.from('blocked_prayer_authors').select('blocked_author_id'),
    ]);

    if (reportsResult.error) {
      throw reportsResult.error;
    }
    if (blocksResult.error) {
      throw blocksResult.error;
    }

    return {
      hiddenPrayerIds: new Set(
        ((reportsResult.data ?? []) as { prayer_id: string }[]).map((row) => row.prayer_id),
      ),
      blockedAuthorIds: new Set(
        ((blocksResult.data ?? []) as { blocked_author_id: string }[]).map(
          (row) => row.blocked_author_id,
        ),
      ),
    };
  } catch (error) {
    warnServerFallback('load safety controls from Supabase', error);
    return emptyControls;
  }
}

export async function submitPrayerReport({
  blockAuthor,
  details,
  prayerId,
  reportedAuthorId,
  reason,
}: {
  blockAuthor: boolean;
  details?: string;
  prayerId: string;
  reportedAuthorId?: string | null;
  reason: PrayerReportReason;
}) {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Reports must be saved on the server.');
  }

  const reporterId = await ensureSupabaseProfile();
  const report = buildPrayerReportInsert({
    details,
    prayerId,
    reportedAuthorId,
    reporterId,
    reason,
  });
  const { error: reportError } = await supabase
    .from('prayer_reports')
    .upsert(report, { onConflict: 'prayer_id,reporter_id' });

  if (reportError) {
    throw reportError;
  }

  if (blockAuthor && reportedAuthorId && reportedAuthorId !== reporterId) {
    const { error: blockError } = await supabase.from('blocked_prayer_authors').upsert(
      {
        blocker_id: reporterId,
        blocked_author_id: reportedAuthorId,
      },
      { onConflict: 'blocker_id,blocked_author_id' },
    );

    if (blockError) {
      throw blockError;
    }
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
