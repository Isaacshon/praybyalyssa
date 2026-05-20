import type { ImageSourcePropType } from 'react-native';

export const postItPinImages: ImageSourcePropType[] = [
  require('../../../assets/images/praybor/post-it/pins/01_strawberry_red_pin.png'),
  require('../../../assets/images/praybor/post-it/pins/02_pumpkin_spice_pin.png'),
  require('../../../assets/images/praybor/post-it/pins/03_carrot_orange_pin.png'),
  require('../../../assets/images/praybor/post-it/pins/04_atomic_tangerine_pin.png'),
  require('../../../assets/images/praybor/post-it/pins/05_tuscan_sun_pin.png'),
  require('../../../assets/images/praybor/post-it/pins/06_willow_green_pin.png'),
  require('../../../assets/images/praybor/post-it/pins/07_seaweed_pin.png'),
  require('../../../assets/images/praybor/post-it/pins/08_dark_cyan_pin.png'),
  require('../../../assets/images/praybor/post-it/pins/09_blue_slate_pin.png'),
  require('../../../assets/images/praybor/post-it/pins/10_cerulean_blue_pin.png'),
  require('../../../assets/images/praybor/post-it/pins/11_soft_lavender_pin.png'),
  require('../../../assets/images/praybor/post-it/pins/12_vivid_violet_pin.png'),
  require('../../../assets/images/praybor/post-it/pins/13_bubblegum_pink_pin.png'),
];

export function getPostItPinImage(index: number) {
  return postItPinImages[Math.abs(index * 5 + 3) % postItPinImages.length];
}

export function getPostItPinImageForKey(key: string) {
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }

  return getPostItPinImage(hash);
}
