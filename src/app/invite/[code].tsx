import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

export default function InviteLinkRoute() {
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();

  useEffect(() => {
    const inviteCode = Array.isArray(code) ? code[0] : code;

    router.replace({
      pathname: '/groups',
      params: inviteCode ? { invite: inviteCode } : undefined,
    });
  }, [code]);

  return null;
}
