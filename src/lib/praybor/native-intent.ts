const authCallbackRoute = '/auth-callback';

export function rewriteBlessieNativeIntentPath(path: string) {
  const candidates = createDecodeCandidates(path);

  for (const candidate of candidates) {
    const rewrittenPath = rewriteAuthCallbackPath(candidate);

    if (rewrittenPath) {
      return rewrittenPath;
    }
  }

  return path;
}

function createDecodeCandidates(path: string) {
  const candidates = [path];

  try {
    const decodedPath = decodeURIComponent(path);

    if (decodedPath !== path) {
      candidates.push(decodedPath);
    }
  } catch {
    // Expo Router requires native-intent handlers to avoid throwing.
  }

  return candidates;
}

function rewriteAuthCallbackPath(path: string) {
  if (isRoutePath(path)) {
    return path;
  }

  if (isRoutePath(`/${path}`)) {
    return `/${path}`;
  }

  try {
    const url = new URL(path, 'blessie://app');
    const isBlessieScheme = url.protocol === 'blessie:';
    const isBlessieWebCallback = url.protocol === 'https:' && url.hostname === 'blessie.ca';
    const targetsCallbackHost = url.hostname === 'auth-callback';
    const targetsCallbackPath = url.pathname === authCallbackRoute;

    if ((isBlessieScheme || isBlessieWebCallback) && (targetsCallbackHost || targetsCallbackPath)) {
      return `${authCallbackRoute}${url.search}${url.hash}`;
    }
  } catch {
    return null;
  }

  return null;
}

function isRoutePath(path: string) {
  return path === authCallbackRoute || path.startsWith(`${authCallbackRoute}?`) || path.startsWith(`${authCallbackRoute}#`);
}
