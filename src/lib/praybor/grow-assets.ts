import { Asset } from 'expo-asset';
import { Image as ExpoImage } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

export const fieldImage = require('../../../assets/images/praybor/forest/forest-base.png');
export const forestTreeLayerImage = require('../../../assets/images/praybor/forest/forest-trees.png');
export const forestLeafLayerImage = require('../../../assets/images/praybor/forest/forest-leaves.png');
export const nextFieldImage = require('../../../assets/images/praybor/forest/ground2.png');
export const FOREST_FLAT_MAP_IMAGE = require('../../../assets/images/praybor/diorama/forest-flat-grid.jpg');
export const FOREST_DIORAMA_PLATFORM_IMAGES = {
  forest: require('../../../assets/images/praybor/diorama/forest.png'),
  desert: require('../../../assets/images/praybor/diorama/desert.png'),
  moon: require('../../../assets/images/praybor/diorama/moon.png'),
} satisfies Record<string, ImageSourcePropType>;
export const FOREST_DIORAMA_PLATFORM_PREVIEW_IMAGES = {
  forest: require('../../../assets/images/praybor/previews/diorama/forest.webp'),
  desert: require('../../../assets/images/praybor/previews/diorama/desert.webp'),
  moon: require('../../../assets/images/praybor/previews/diorama/moon.webp'),
} satisfies Record<string, ImageSourcePropType>;
export const FOREST_DIORAMA_BACKGROUND_IMAGES = {
  forest: require('../../../assets/images/praybor/diorama/background/forest.jpg'),
  desert: require('../../../assets/images/praybor/diorama/background/desert.jpg'),
  moon: require('../../../assets/images/praybor/diorama/background/moon.jpg'),
} satisfies Record<string, ImageSourcePropType>;
export const ANIMAL_COMPANION_IMAGE_ASSETS: Partial<Record<
  string,
  {
    walkingImage: ImageSourcePropType;
    idleImage: ImageSourcePropType;
  }
>> = {
  baby_rabbit: {
    walkingImage: require('../../../assets/images/praybor/animals/baby-rabbit-side.gif'),
    idleImage: require('../../../assets/images/praybor/animals/baby-rabbit-front.gif'),
  },
  dog: {
    walkingImage: require('../../../assets/images/praybor/animals/dog-side.gif'),
    idleImage: require('../../../assets/images/praybor/animals/dog-front.gif'),
  },
  desert_fox: {
    walkingImage: require('../../../assets/images/praybor/animals/desert-fox-side.gif'),
    idleImage: require('../../../assets/images/praybor/animals/desert-fox-front.gif'),
  },
  rock_hyrax: {
    walkingImage: require('../../../assets/images/praybor/animals/rock-hyrax-side.gif'),
    idleImage: require('../../../assets/images/praybor/animals/rock-hyrax-front.gif'),
  },
  lion: {
    walkingImage: require('../../../assets/images/praybor/animals/lion-side.gif'),
    idleImage: require('../../../assets/images/praybor/animals/lion-front.gif'),
  },
  sheep: {
    walkingImage: require('../../../assets/images/praybor/animals/sheep-side.gif'),
    idleImage: require('../../../assets/images/praybor/animals/sheep-front.gif'),
  },
};
export const ANIMAL_COMPANION_PREVIEW_IMAGES: Record<string, ImageSourcePropType> = {
  baby_rabbit: require('../../../assets/images/praybor/previews/animals/baby_rabbit.webp'),
  dog: require('../../../assets/images/praybor/previews/animals/dog.webp'),
  desert_fox: require('../../../assets/images/praybor/previews/animals/desert_fox.webp'),
  rock_hyrax: require('../../../assets/images/praybor/previews/animals/rock_hyrax.webp'),
  lion: require('../../../assets/images/praybor/previews/animals/lion.webp'),
  sheep: require('../../../assets/images/praybor/previews/animals/sheep.webp'),
};
export const GROW_MAP_SCENE_ASSETS = {
  forest: {
    id: 'forest',
    guideImage: require('../../../assets/images/praybor/maps/forest/guide.png'),
    backgroundImage: require('../../../assets/images/praybor/maps/forest/background.png'),
    stillLayerImage: require('../../../assets/images/praybor/maps/forest/still.png'),
    breezeLayerImage: require('../../../assets/images/praybor/maps/forest/breeze.png'),
  },
  wilderness: {
    id: 'wilderness',
    guideImage: require('../../../assets/images/praybor/maps/wilderness/guide.png'),
    backgroundImage: require('../../../assets/images/praybor/maps/wilderness/background.png'),
    stillLayerImage: require('../../../assets/images/praybor/maps/wilderness/still.png'),
    breezeLayerImage: require('../../../assets/images/praybor/maps/wilderness/breeze.png'),
  },
  highland: {
    id: 'highland',
    guideImage: require('../../../assets/images/praybor/maps/highland/guide.png'),
    backgroundImage: require('../../../assets/images/praybor/maps/highland/background.png'),
    stillLayerImage: require('../../../assets/images/praybor/maps/highland/still.png'),
    breezeLayerImage: require('../../../assets/images/praybor/maps/highland/breeze.png'),
  },
  garden: {
    id: 'garden',
    guideImage: require('../../../assets/images/praybor/maps/garden/guide.png'),
    backgroundImage: require('../../../assets/images/praybor/maps/garden/background.png'),
    stillLayerImage: require('../../../assets/images/praybor/maps/garden/still.png'),
    breezeLayerImage: require('../../../assets/images/praybor/maps/garden/breeze.png'),
  },
  flowerGarden: {
    id: 'flowerGarden',
    guideImage: require('../../../assets/images/praybor/maps/flower-garden/guide.png'),
    backgroundImage: require('../../../assets/images/praybor/maps/flower-garden/background.png'),
    stillLayerImage: require('../../../assets/images/praybor/maps/flower-garden/still.png'),
    breezeLayerImage: require('../../../assets/images/praybor/maps/flower-garden/breeze.png'),
  },
  nightSky: {
    id: 'nightSky',
    guideImage: require('../../../assets/images/praybor/maps/night-sky/guide.png'),
    backgroundImage: require('../../../assets/images/praybor/maps/night-sky/background.png'),
    stillLayerImage: require('../../../assets/images/praybor/maps/night-sky/still.png'),
    breezeLayerImage: require('../../../assets/images/praybor/maps/night-sky/breeze.png'),
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
export const GROW_MAP_PREVIEW_IMAGES: Record<string, ImageSourcePropType> = {
  forest: require('../../../assets/images/praybor/previews/maps/forest.webp'),
  wilderness: require('../../../assets/images/praybor/previews/maps/wilderness.webp'),
  highland: require('../../../assets/images/praybor/previews/maps/highland.webp'),
  garden: require('../../../assets/images/praybor/previews/maps/garden.webp'),
  flowerGarden: require('../../../assets/images/praybor/previews/maps/flowerGarden.webp'),
  nightSky: require('../../../assets/images/praybor/previews/maps/nightSky.webp'),
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
export const TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES: Record<string, ImageSourcePropType[]> = {
  plum: [
    require('../../../assets/images/praybor/previews/trees/plum-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/plum-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/plum-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/plum-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/plum-stage-05.webp'),
  ],
  cherry: [
    require('../../../assets/images/praybor/previews/trees/cherry-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/cherry-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/cherry-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/cherry-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/cherry-stage-05.webp'),
  ],
  olive: [
    require('../../../assets/images/praybor/previews/trees/olive-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/olive-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/olive-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/olive-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/olive-stage-05.webp'),
  ],
  orange: [
    require('../../../assets/images/praybor/previews/trees/orange-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/orange-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/orange-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/orange-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/orange-stage-05.webp'),
  ],
  palm: [
    require('../../../assets/images/praybor/previews/trees/palm-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/palm-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/palm-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/palm-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/palm-stage-05.webp'),
  ],
  avocado: [
    require('../../../assets/images/praybor/previews/trees/avocado-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/avocado-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/avocado-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/avocado-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/avocado-stage-05.webp'),
  ],
  almond: [
    require('../../../assets/images/praybor/previews/trees/almond-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/almond-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/almond-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/almond-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/almond-stage-05.webp'),
  ],
  pomegranate: [
    require('../../../assets/images/praybor/previews/trees/pomegranate-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/pomegranate-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/pomegranate-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/pomegranate-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/pomegranate-stage-05.webp'),
  ],
  apricot: [
    require('../../../assets/images/praybor/previews/trees/apricot-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/apricot-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/apricot-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/apricot-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/apricot-stage-05.webp'),
  ],
  apple: [
    require('../../../assets/images/praybor/previews/trees/apple-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/apple-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/apple-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/apple-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/apple-stage-05.webp'),
  ],
  loquat: [
    require('../../../assets/images/praybor/previews/trees/loquat-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/loquat-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/loquat-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/loquat-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/loquat-stage-05.webp'),
  ],
  peach: [
    require('../../../assets/images/praybor/previews/trees/peach-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/peach-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/peach-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/peach-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/peach-stage-05.webp'),
  ],
  pear: [
    require('../../../assets/images/praybor/previews/trees/pear-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/pear-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/pear-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/pear-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/pear-stage-05.webp'),
  ],
  chestnut: [
    require('../../../assets/images/praybor/previews/trees/chestnut-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/chestnut-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/chestnut-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/chestnut-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/chestnut-stage-05.webp'),
  ],
  mango: [
    require('../../../assets/images/praybor/previews/trees/mango-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/mango-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/mango-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/mango-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/mango-stage-05.webp'),
  ],
  guava: [
    require('../../../assets/images/praybor/previews/trees/guava-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/guava-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/guava-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/guava-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/guava-stage-05.webp'),
  ],
  persimmon: [
    require('../../../assets/images/praybor/previews/trees/persimmon-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/persimmon-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/persimmon-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/persimmon-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/persimmon-stage-05.webp'),
  ],
  grape_vine: [
    require('../../../assets/images/praybor/previews/trees/grape_vine-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/grape_vine-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/grape_vine-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/grape_vine-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/grape_vine-stage-05.webp'),
  ],
  cedar: [
    require('../../../assets/images/praybor/previews/trees/cedar-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/cedar-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/cedar-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/cedar-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/cedar-stage-05.webp'),
  ],
  baobab: [
    require('../../../assets/images/praybor/previews/trees/baobab-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/baobab-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/baobab-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/baobab-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/baobab-stage-05.webp'),
  ],
  walnut: [
    require('../../../assets/images/praybor/previews/trees/walnut-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/walnut-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/walnut-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/walnut-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/walnut-stage-05.webp'),
  ],
  cherry_blossom: [
    require('../../../assets/images/praybor/previews/trees/cherry_blossom-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/cherry_blossom-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/cherry_blossom-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/cherry_blossom-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/cherry_blossom-stage-05.webp'),
  ],
  ginkgo: [
    require('../../../assets/images/praybor/previews/trees/ginkgo-stage-01.webp'),
    require('../../../assets/images/praybor/previews/trees/ginkgo-stage-02.webp'),
    require('../../../assets/images/praybor/previews/trees/ginkgo-stage-03.webp'),
    require('../../../assets/images/praybor/previews/trees/ginkgo-stage-04.webp'),
    require('../../../assets/images/praybor/previews/trees/ginkgo-stage-05.webp'),
  ],
};
let growAssetsPreloadPromise: Promise<void> | null = null;
let growAssetsReady = false;
const growPreloadedImageSourceKeys = new Set<string>();
const growPreloadingImageSourcePromises = new Map<string, Promise<void>>();

type GrowImagePreloadOptions = {
  cachePolicy?: 'disk' | 'memory' | 'memory-disk';
  chunkSize?: number;
};

export function areGrowScreenAssetsReady() {
  return growAssetsReady;
}

function getUniqueAssetModules(sources: readonly ImageSourcePropType[]) {
  return Array.from(new Set(sources.filter((asset): asset is number => typeof asset === 'number')));
}

function getGrowImageSourceKey(source: ImageSourcePropType) {
  if (typeof source === 'number') {
    return `module:${source}`;
  }

  const uri = getGrowImageUri(source);

  return uri ? `uri:${uri}` : null;
}

function getGrowScreenDeferredImageSources() {
  return [
    fieldImage,
    forestTreeLayerImage,
    forestLeafLayerImage,
    nextFieldImage,
    FOREST_FLAT_MAP_IMAGE,
    ...Object.values(GROW_MAP_PREVIEW_IMAGES),
    ...Object.values(FOREST_DIORAMA_PLATFORM_PREVIEW_IMAGES),
    ...Object.values(ANIMAL_COMPANION_PREVIEW_IMAGES),
    ...Object.values(GROW_MAP_SCENE_ASSETS).flatMap((area) =>
      [
        area.guideImage,
        area.backgroundImage,
        area.stillLayerImage,
        area.breezeLayerImage,
      ].filter((source): source is ImageSourcePropType => Boolean(source)),
    ),
    ...Object.values(ANIMAL_COMPANION_IMAGE_ASSETS)
      .filter(
        (animalAssets): animalAssets is {
          walkingImage: ImageSourcePropType;
          idleImage: ImageSourcePropType;
        } => Boolean(animalAssets),
      )
      .flatMap((animalAssets) => [
        animalAssets.walkingImage,
        animalAssets.idleImage,
      ]),
    ...Object.values(TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES).flat(),
    ...Object.values(TREE_STAGE_IMAGES_BY_SPECIES).flat(),
  ];
}

export function getGrowScreenCriticalImageAssets() {
  const appleStagePreviewImages = TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES.apple ?? [];

  return getUniqueAssetModules([
    GROW_MAP_PREVIEW_IMAGES.forest,
    appleStagePreviewImages[0],
    appleStagePreviewImages[4],
  ].filter((asset): asset is ImageSourcePropType => Boolean(asset)));
}

export function getGrowScreenImageAssets() {
  return getUniqueAssetModules(getGrowScreenDeferredImageSources());
}

export async function preloadGrowImageSources(
  sources: readonly ImageSourcePropType[],
  options: GrowImagePreloadOptions = {},
) {
  const cachePolicy = options.cachePolicy ?? 'memory-disk';
  const chunkSize = Math.max(1, options.chunkSize ?? 6);
  const preloadJobStarters: (() => Promise<void>)[] = [];
  const queuedSourceKeys = new Set<string>();

  for (const source of sources) {
    const key = getGrowImageSourceKey(source);

    if (!key || growPreloadedImageSourceKeys.has(key) || queuedSourceKeys.has(key)) {
      continue;
    }

    queuedSourceKeys.add(key);
    const existingPreloadJob = growPreloadingImageSourcePromises.get(key);

    if (existingPreloadJob) {
      preloadJobStarters.push(() => existingPreloadJob);
      continue;
    }

    preloadJobStarters.push(() => {
      const preloadJob = preloadSingleGrowImageSource(source, cachePolicy)
        .then(() => {
          growPreloadedImageSourceKeys.add(key);
        })
        .finally(() => {
          if (growPreloadingImageSourcePromises.get(key) === preloadJob) {
            growPreloadingImageSourcePromises.delete(key);
          }
        });

      growPreloadingImageSourcePromises.set(key, preloadJob);

      return preloadJob;
    });
  }

  if (preloadJobStarters.length === 0) {
    return;
  }

  for (let index = 0; index < preloadJobStarters.length; index += chunkSize) {
    await Promise.all(
      preloadJobStarters.slice(index, index + chunkSize).map((startPreloadJob) => startPreloadJob()),
    );
  }
}

async function preloadSingleGrowImageSource(
  source: ImageSourcePropType,
  cachePolicy: NonNullable<GrowImagePreloadOptions['cachePolicy']>,
) {
  const moduleAssets = getUniqueAssetModules([source]);
  const loadedAssets = moduleAssets.length > 0 ? await Asset.loadAsync(moduleAssets) : [];
  const loadedUris = loadedAssets
    .map((asset) => asset.localUri ?? asset.uri)
    .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);
  const directUri = moduleAssets.length === 0 ? getGrowImageUri(source) : null;
  const directUris =
    typeof directUri === 'string' && directUri.length > 0 ? [directUri] : [];
  const uris = Array.from(new Set([...loadedUris, ...directUris]));

  if (uris.length === 0) {
    return;
  }

  const prefetched = await ExpoImage.prefetch(uris, { cachePolicy });

  if (!prefetched) {
    throw new Error('Grow image prefetch failed.');
  }
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
    growAssetsPreloadPromise = preloadGrowImageSources(
      getGrowScreenCriticalImageAssets(),
      { chunkSize: 3 },
    )
      .then(() => {
        growAssetsReady = true;
      })
      .catch((error) => {
        growAssetsPreloadPromise = null;
        throw error;
      });
  }

  return growAssetsPreloadPromise;
}
