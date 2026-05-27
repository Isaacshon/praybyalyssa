export type PrayerLocation = {
  latitude: number;
  longitude: number;
};

export type PrayerLocationResult =
  | { status: 'granted'; location: PrayerLocation }
  | { status: 'denied'; canAskAgain: boolean; location: null }
  | { status: 'unavailable'; canAskAgain?: boolean; location: null };

export function distanceKmBetween(a: PrayerLocation, b: PrayerLocation) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const isWebRuntime =
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as { document?: unknown }).document !== 'undefined';

export async function requestPrayerLocation(): Promise<PrayerLocationResult> {
  try {
    const Location = await import('expo-location');
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      if (isWebRuntime) {
        return {
          status: 'granted',
          location: {
            latitude: 43.6532,
            longitude: -79.3832,
          },
        };
      }

      return {
        canAskAgain: permission.canAskAgain ?? true,
        status: 'denied',
        location: null,
      };
    }

    const result = await Location.getCurrentPositionAsync({});

    return {
      status: 'granted',
      location: {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      },
    };
  } catch (error) {
    console.warn('Could not request prayer board location.', error);

    if (isWebRuntime) {
      return {
        status: 'granted',
        location: {
          latitude: 43.6532,
          longitude: -79.3832,
        },
      };
    }

    return { status: 'unavailable', location: null };
  }
}

export async function openPrayerLocationSettings() {
  const { Linking, Platform } = await import('react-native');

  if (Platform.OS === 'web') {
    return;
  }

  await Linking.openSettings();
}

function toRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}
