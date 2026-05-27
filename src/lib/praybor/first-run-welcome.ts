import { getAsyncStorage } from './session';

const PUBLIC_BOARD_WELCOME_DISMISSED_KEY = 'blessie:public-board-welcome-dismissed:v1';

export async function hasDismissedPublicBoardWelcome() {
  const AsyncStorage = await getAsyncStorage();

  return (await AsyncStorage.getItem(PUBLIC_BOARD_WELCOME_DISMISSED_KEY)) === 'true';
}

export async function dismissPublicBoardWelcome() {
  const AsyncStorage = await getAsyncStorage();

  await AsyncStorage.setItem(PUBLIC_BOARD_WELCOME_DISMISSED_KEY, 'true');
}
