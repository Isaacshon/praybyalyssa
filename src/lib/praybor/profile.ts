export type ProfileRow = {
  avatar_url?: string | null;
  display_name?: string | null;
  email?: string | null;
  full_name?: string | null;
  nickname?: string | null;
};

export type ProfileUser = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export type ResolvedProfileSession = {
  avatarUrl: string | null;
  displayName: string;
  sessionLabel: string;
};

export const profileAvatarBucket = 'profile-avatars';

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function emailLocalPart(email?: string | null) {
  const normalized = firstNonEmptyString(email);

  return normalized?.split('@')[0] ?? null;
}

export function resolveProfileSession(
  profile: ProfileRow | null | undefined,
  user: ProfileUser,
): ResolvedProfileSession {
  const metadata = user.user_metadata ?? {};
  const email = firstNonEmptyString(profile?.email, user.email);
  const nickname = firstNonEmptyString(profile?.nickname, metadata.nickname);
  const displayName =
    firstNonEmptyString(
      profile?.display_name,
      profile?.full_name,
      metadata.display_name,
      metadata.full_name,
      metadata.name,
      nickname,
      emailLocalPart(email),
    ) ?? 'Signed in';
  const avatarUrl =
    firstNonEmptyString(profile?.avatar_url, metadata.avatar_url, metadata.picture) ?? null;

  return {
    avatarUrl,
    displayName,
    sessionLabel: email ?? nickname ?? displayName,
  };
}

export async function uploadProfileAvatar(uri: string) {
  const { requireSupabaseUser, getSupabaseRuntime } = await import('./session');
  const user = await requireSupabaseUser('Please sign in before changing your profile photo.');
  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error('Could not read the selected profile photo.');
  }

  const blob = await response.blob();
  const contentType = normalizeAvatarContentType(blob.type, uri);
  const extension = avatarExtensionForContentType(contentType);
  const path = `${user.id}/avatar-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(profileAvatarBucket)
    .upload(path, blob, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(profileAvatarBucket).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        avatar_url: publicUrl,
        id: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

  if (profileError) {
    throw profileError;
  }

  return publicUrl;
}

function normalizeAvatarContentType(contentType: string | null | undefined, uri: string) {
  if (contentType === 'image/jpeg' || contentType === 'image/png' || contentType === 'image/webp') {
    return contentType;
  }

  const lowerUri = uri.toLowerCase();

  if (lowerUri.endsWith('.png')) {
    return 'image/png';
  }

  if (lowerUri.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
}

function avatarExtensionForContentType(contentType: string) {
  if (contentType === 'image/png') {
    return 'png';
  }

  if (contentType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}
