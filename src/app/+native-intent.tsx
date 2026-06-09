import { rewriteBlessieNativeIntentPath } from '@/lib/praybor/native-intent';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return rewriteBlessieNativeIntentPath(path);
}
