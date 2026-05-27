import { ensureSupabaseProfile, getCurrentSupabaseUser, getSupabaseRuntime, warnServerFallback } from './session';

export const ACCOUNT_DELETION_GRACE_HOURS = 24;

export type AccountDeletionStatus = 'pending' | 'canceled' | 'completed';

export type AccountDeletionRequestRow = {
  user_id: string;
  status: AccountDeletionStatus;
  requested_at: string;
  scheduled_for: string;
  canceled_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AccountDeletionRequest = {
  userId: string;
  status: AccountDeletionStatus;
  requestedAt: string;
  scheduledFor: string;
  canceledAt: string | null;
};

export function buildAccountDeletionRequestUpsert(
  userId: string,
  requestedAt = new Date(),
): AccountDeletionRequestRow {
  const scheduledFor = new Date(
    requestedAt.getTime() + ACCOUNT_DELETION_GRACE_HOURS * 60 * 60 * 1000,
  );

  return {
    user_id: userId,
    status: 'pending',
    requested_at: requestedAt.toISOString(),
    scheduled_for: scheduledFor.toISOString(),
    canceled_at: null,
  };
}

export function mapAccountDeletionRequestRow(
  row: AccountDeletionRequestRow,
): AccountDeletionRequest {
  return {
    userId: row.user_id,
    status: row.status,
    requestedAt: row.requested_at,
    scheduledFor: row.scheduled_for,
    canceledAt: row.canceled_at,
  };
}

export function isAccountDeletionPending(request: AccountDeletionRequest | null) {
  return request?.status === 'pending';
}

export async function fetchAccountDeletionRequest() {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const user = await getCurrentSupabaseUser();

    if (!user || user.is_anonymous) {
      return null;
    }

    const userId = user.id;
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('user_id,status,requested_at,scheduled_for,canceled_at,created_at,updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapAccountDeletionRequestRow(data as AccountDeletionRequestRow) : null;
  } catch (error) {
    warnServerFallback('load account deletion request from Supabase', error);
    return null;
  }
}

export async function scheduleAccountDeletion() {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Account deletion must be saved on the server.');
  }

  await ensureSupabaseProfile();
  const { data, error } = await supabase
    .rpc('schedule_account_deletion')
    .returns<AccountDeletionRequestRow>();

  if (error) {
    throw error;
  }

  return mapAccountDeletionRequestRow(data as AccountDeletionRequestRow);
}

export async function cancelAccountDeletion() {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Account deletion cancellation must be saved on the server.');
  }

  await ensureSupabaseProfile();
  const { data, error } = await supabase
    .rpc('cancel_account_deletion')
    .returns<AccountDeletionRequestRow>();

  if (error) {
    throw error;
  }

  return mapAccountDeletionRequestRow(data as AccountDeletionRequestRow);
}
