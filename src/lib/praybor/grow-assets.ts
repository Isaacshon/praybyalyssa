import { Asset } from 'expo-asset';
import { Image as ExpoImage } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

export const fieldImage = require('../../../assets/images/praybor/forest/forest-base.png');
export const forestTreeLayerImage = require('../../../assets/images/praybor/forest/forest-trees.png');
export const forestLeafLayerImage = require('../../../assets/images/praybor/forest/forest-leaves.png');
export const nextFieldImage = require('../../../assets/images/praybor/forest/ground2.png');
export const ANIMAL_COMPANION_IMAGE_ASSETS: Partial<Record<
  string,
  {
    walkingImage: ImageSourcePropType;
    idleImage: ImageSourcePropType;
  }
>> = {
  baby_rabbit: {
    walkingImage: require('../../../Logo/forest asset/동물/아기토끼/사이드뷰.gif'),
    idleImage: require('../../../Logo/forest asset/동물/아기토끼/정면.gif'),
  },
  dog: {
    walkingImage: require('../../../Logo/forest asset/동물/강아지/사이드뷰.gif'),
    idleImage: require('../../../Logo/forest asset/동물/강아지/정면.gif'),
  },
  desert_fox: {
    walkingImage: require('../../../assets/images/praybor/animals/desert-fox-side-stable.gif'),
    idleImage: require('../../../Logo/forest asset/동물/사막여우/정면.gif'),
  },
  rock_hyrax: {
    walkingImage: require('../../../Logo/forest asset/동물/바위너구리/사이드뷰.gif'),
    idleImage: require('../../../Logo/forest asset/동물/바위너구리/정면.gif'),
  },
  lion: {
    walkingImage: require('../../../Logo/forest asset/동물/사자/사이드뷰.gif'),
    idleImage: require('../../../Logo/forest asset/동물/사자/정면.gif'),
  },
  sheep: {
    walkingImage: require('../../../Logo/forest asset/동물/양/사이드뷰.gif'),
    idleImage: require('../../../Logo/forest asset/동물/양/정면.gif'),
  },
};
export const GROW_MAP_SCENE_ASSETS = {
  forest: {
    id: 'forest',
    guideImage: require('../../../Logo/forest asset/배경/숲/도감.png'),
    backgroundImage: require('../../../Logo/forest asset/배경/숲/숲.png'),
    stillLayerImage: require('../../../Logo/forest asset/배경/숲/나무.png'),
    breezeLayerImage: require('../../../Logo/forest asset/배경/숲/풀.png'),
  },
  wilderness: {
    id: 'wilderness',
    guideImage: require('../../../Logo/forest asset/배경/광야/도감.png'),
    backgroundImage: require('../../../Logo/forest asset/배경/광야/땅.png'),
    stillLayerImage: require('../../../Logo/forest asset/배경/광야/돌.png'),
    breezeLayerImage: require('../../../Logo/forest asset/배경/광야/풀.png'),
  },
  highland: {
    id: 'highland',
    guideImage: require('../../../Logo/forest asset/배경/고원/preview_combined.png'),
    backgroundImage: require('../../../Logo/forest asset/배경/고원/01_base_highland_ground_path.png'),
    stillLayerImage: require('../../../Logo/forest asset/배경/고원/02_terrain_mountains_stream_rocks.png'),
    breezeLayerImage: require('../../../Logo/forest asset/배경/고원/03_vegetation_olive_carmel_details.png'),
  },
  garden: {
    id: 'garden',
    guideImage: require('../../../Logo/forest asset/배경/동산/프리뷰.png'),
    backgroundImage: require('../../../Logo/forest asset/배경/동산/배경 1.png'),
    stillLayerImage: require('../../../Logo/forest asset/배경/동산/배경 2.png'),
    breezeLayerImage: require('../../../Logo/forest asset/배경/동산/배경 3.png'),
  },
  flowerGarden: {
    id: 'flowerGarden',
    guideImage: require('../../../Logo/forest asset/배경/꽃밭/프리뷰.png'),
    backgroundImage: require('../../../Logo/forest asset/배경/꽃밭/배경1.png'),
    stillLayerImage: require('../../../Logo/forest asset/배경/꽃밭/배경2.png'),
    breezeLayerImage: require('../../../Logo/forest asset/배경/꽃밭/배경3.png'),
  },
  nightSky: {
    id: 'nightSky',
    guideImage: require('../../../Logo/forest asset/배경/밤하늘/프리뷰.png'),
    backgroundImage: require('../../../Logo/forest asset/배경/밤하늘/1.png'),
    stillLayerImage: require('../../../Logo/forest asset/배경/밤하늘/2.png'),
    breezeLayerImage: require('../../../Logo/forest asset/배경/밤하늘/3.png'),
  },
} satisfies Record<
  string,
  {
    id: string;
    guideImage: ImageSourcePropType;
    backgroundImage: ImageSourcePropType;
    stillLayerImage?: ImageSourcePropType;
    breezeLayerImage?: ImageSourcePropType;
  }
>;
export const GROW_MAP_GUIDE_IMAGES: Record<string, ImageSourcePropType> = {
  forest: GROW_MAP_SCENE_ASSETS.forest.guideImage,
  wilderness: GROW_MAP_SCENE_ASSETS.wilderness.guideImage,
  highland: GROW_MAP_SCENE_ASSETS.highland.guideImage,
  garden: GROW_MAP_SCENE_ASSETS.garden.guideImage,
  flowerGarden: GROW_MAP_SCENE_ASSETS.flowerGarden.guideImage,
  nightSky: GROW_MAP_SCENE_ASSETS.nightSky.guideImage,
};

export const TREE_STAGE_IMAGES_BY_SPECIES: Record<string, ImageSourcePropType[]> = {
  plum: [
    require('../../../assets/images/praybor/trees/tree-01-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-01-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-01-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-01-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-01-stage-05.png'),
  ],
  cherry: [
    require('../../../assets/images/praybor/trees/tree-02-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-02-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-02-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-02-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-02-stage-05.png'),
  ],
  olive: [
    require('../../../assets/images/praybor/trees/tree-03-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-03-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-03-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-03-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-03-stage-05.png'),
  ],
  orange: [
    require('../../../assets/images/praybor/trees/tree-04-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-04-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-04-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-04-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-04-stage-05.png'),
  ],
  palm: [
    require('../../../assets/images/praybor/trees/tree-05-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-05-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-05-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-05-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-05-stage-05.png'),
  ],
  avocado: [
    require('../../../assets/images/praybor/trees/tree-06-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-06-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-06-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-06-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-06-stage-05.png'),
  ],
  almond: [
    require('../../../assets/images/praybor/trees/tree-07-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-07-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-07-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-07-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-07-stage-05.png'),
  ],
  pomegranate: [
    require('../../../assets/images/praybor/trees/tree-08-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-08-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-08-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-08-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-08-stage-05.png'),
  ],
  apricot: [
    require('../../../assets/images/praybor/trees/tree-09-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-09-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-09-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-09-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-09-stage-05.png'),
  ],
  apple: [
    require('../../../assets/images/praybor/trees/tree-10-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-10-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-10-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-10-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-10-stage-05.png'),
  ],
  loquat: [
    require('../../../assets/images/praybor/trees/tree-11-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-11-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-11-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-11-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-11-stage-05.png'),
  ],
  peach: [
    require('../../../assets/images/praybor/trees/tree-12-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-12-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-12-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-12-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-12-stage-05.png'),
  ],
  pear: [
    require('../../../assets/images/praybor/trees/tree-13-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-13-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-13-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-13-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-13-stage-05.png'),
  ],
  chestnut: [
    require('../../../assets/images/praybor/trees/tree-14-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-14-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-14-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-14-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-14-stage-05.png'),
  ],
  mango: [
    require('../../../assets/images/praybor/trees/tree-15-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-15-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-15-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-15-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-15-stage-05.png'),
  ],
  guava: [
    require('../../../assets/images/praybor/trees/tree-16-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-16-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-16-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-16-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-16-stage-05.png'),
  ],
  persimmon: [
    require('../../../assets/images/praybor/trees/tree-17-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-17-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-17-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-17-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-17-stage-05.png'),
  ],
  grape_vine: [
    require('../../../assets/images/praybor/trees/tree-15-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-15-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-15-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-15-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-15-stage-05.png'),
  ],
  cedar: [
    require('../../../assets/images/praybor/trees/tree-03-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-03-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-03-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-03-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-03-stage-05.png'),
  ],
  baobab: [
    require('../../../assets/images/praybor/trees/tree-05-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-05-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-05-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-05-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-05-stage-05.png'),
  ],
  walnut: [
    require('../../../assets/images/praybor/trees/tree-07-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-07-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-07-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-07-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-07-stage-05.png'),
  ],
  cherry_blossom: [
    require('../../../assets/images/praybor/trees/tree-02-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-02-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-02-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-02-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-02-stage-05.png'),
  ],
  ginkgo: [
    require('../../../assets/images/praybor/trees/tree-09-stage-01.png'),
    require('../../../assets/images/praybor/trees/tree-09-stage-02.png'),
    require('../../../assets/images/praybor/trees/tree-09-stage-03.png'),
    require('../../../assets/images/praybor/trees/tree-09-stage-04.png'),
    require('../../../assets/images/praybor/trees/tree-09-stage-05.png'),
  ],
};
let growAssetsPreloadPromise: Promise<void> | null = null;
let growAssetsReady = false;

export function areGrowScreenAssetsReady() {
  return growAssetsReady;
}

export function getGrowScreenImageAssets() {
  const assets = [
    fieldImage,
    forestTreeLayerImage,
    forestLeafLayerImage,
    nextFieldImage,
    ...Object.values(GROW_MAP_SCENE_ASSETS).flatMap((area) =>
      [
        area.guideImage,
        area.backgroundImage,
        area.stillLayerImage,
        area.breezeLayerImage,
      ].filter((source): source is ImageSourcePropType => Boolean(source)),
    ),
    ...Object.values(TREE_STAGE_IMAGES_BY_SPECIES).flat(),
  ];

  return Array.from(new Set(assets.filter((asset): asset is number => typeof asset === 'number')));
}

export function getGrowImageUri(source: ImageSourcePropType) {
  if (typeof source === 'number') {
    try {
      return Asset.fromModule(source).uri;
    } catch {
      return null;
    }
  }

  if (typeof source === 'string') {
    return source;
  }

  if (
    source &&
    !Array.isArray(source) &&
    typeof source === 'object' &&
    'uri' in source &&
    typeof source.uri === 'string'
  ) {
    return source.uri;
  }

  return null;
}

export function preloadGrowScreenAssets() {
  if (growAssetsReady) {
    return Promise.resolve();
  }

  if (!growAssetsPreloadPromise) {
    growAssetsPreloadPromise = Asset.loadAsync(getGrowScreenImageAssets())
      .then(async (assets) => {
        const uris = assets
          .map((asset) => asset.localUri ?? asset.uri)
          .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);

        if (uris.length > 0) {
          await ExpoImage.prefetch(uris, { cachePolicy: 'memory-disk' }).catch(() => false);
        }

        growAssetsReady = true;
      })
      .catch((error) => {
        growAssetsPreloadPromise = null;
        throw error;
      });
  }

  return growAssetsPreloadPromise;
}
