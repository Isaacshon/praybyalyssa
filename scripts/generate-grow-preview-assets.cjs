const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const repoRoot = path.resolve(__dirname, '..');
const assetRoot = path.join(repoRoot, 'assets', 'images', 'praybor');
const previewRoot = path.join(assetRoot, 'previews');

const mapSources = {
  forest: 'maps/forest/guide.png',
  wilderness: 'maps/wilderness/guide.png',
  highland: 'maps/highland/guide.png',
  garden: 'maps/garden/guide.png',
  flowerGarden: 'maps/flower-garden/guide.png',
  nightSky: 'maps/night-sky/guide.png',
};

const animalSources = {
  baby_rabbit: 'animals/baby-rabbit-front.gif',
  desert_fox: 'animals/desert-fox-front.gif',
  rock_hyrax: 'animals/rock-hyrax-front.gif',
  lion: 'animals/lion-front.gif',
  sheep: 'animals/sheep-front.gif',
  dog: 'animals/dog-front.gif',
};

const dioramaSources = {
  forest: 'diorama/forest.png',
  desert: 'diorama/desert.png',
  moon: 'diorama/moon.png',
};

const treeSourcePrefixes = {
  plum: 'tree-01',
  cherry: 'tree-02',
  olive: 'tree-03',
  orange: 'tree-04',
  palm: 'tree-05',
  avocado: 'tree-06',
  almond: 'tree-07',
  pomegranate: 'tree-08',
  apricot: 'tree-09',
  apple: 'tree-10',
  loquat: 'tree-11',
  peach: 'tree-12',
  pear: 'tree-13',
  chestnut: 'tree-14',
  mango: 'tree-15',
  guava: 'tree-16',
  persimmon: 'tree-17',
  grape_vine: 'tree-15',
  cedar: 'tree-03',
  baobab: 'tree-05',
  walnut: 'tree-07',
  cherry_blossom: 'tree-02',
  ginkgo: 'tree-09',
};

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function writeWebpPreview({
  alphaQuality = 80,
  fit = 'inside',
  quality,
  sourcePath,
  targetPath,
  width,
}) {
  ensureParentDirectory(targetPath);
  await sharp(sourcePath, { limitInputPixels: false })
    .resize({ fit, width, withoutEnlargement: true })
    .webp({
      alphaQuality,
      effort: 6,
      quality,
      smartSubsample: true,
    })
    .toFile(targetPath);
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function sumFiles(directory) {
  if (!fs.existsSync(directory)) {
    return 0;
  }

  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const fullPath = path.join(directory, entry.name);

    return total + (entry.isDirectory() ? sumFiles(fullPath) : fs.statSync(fullPath).size);
  }, 0);
}

async function run() {
  for (const [id, relativeSource] of Object.entries(mapSources)) {
    await writeWebpPreview({
      sourcePath: path.join(assetRoot, relativeSource),
      targetPath: path.join(previewRoot, 'maps', `${id}.webp`),
      width: 360,
      quality: 64,
    });
  }

  for (const [id, relativeSource] of Object.entries(animalSources)) {
    await writeWebpPreview({
      sourcePath: path.join(assetRoot, relativeSource),
      targetPath: path.join(previewRoot, 'animals', `${id}.webp`),
      width: 176,
      quality: 72,
    });
  }

  for (const [id, relativeSource] of Object.entries(dioramaSources)) {
    await writeWebpPreview({
      sourcePath: path.join(assetRoot, relativeSource),
      targetPath: path.join(previewRoot, 'diorama', `${id}.webp`),
      width: 540,
      quality: 68,
    });
  }

  for (const [speciesId, sourcePrefix] of Object.entries(treeSourcePrefixes)) {
    for (let stage = 1; stage <= 5; stage += 1) {
      const paddedStage = String(stage).padStart(2, '0');

      await writeWebpPreview({
        sourcePath: path.join(assetRoot, 'trees', `${sourcePrefix}-stage-${paddedStage}.png`),
        targetPath: path.join(previewRoot, 'trees', `${speciesId}-stage-${paddedStage}.webp`),
        width: 280,
        quality: 74,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        previewAssetBytes: formatBytes(sumFiles(previewRoot)),
        previewRoot,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
