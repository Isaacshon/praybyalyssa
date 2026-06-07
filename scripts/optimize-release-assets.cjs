const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const sharp = require('sharp');

const repoRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(repoRoot, 'Logo', 'forest asset');
const outputRoot = path.join(repoRoot, 'assets', 'images', 'praybor');
const intermediateRoot = path.join(repoRoot, '.codex-diagnostics', 'release-assets');
const desertFoxStableGifPath = path.join(intermediateRoot, 'desert-fox-side-stable.gif');

const ko = {
  animal: '\ub3d9\ubb3c',
  background: '\ubc30\uacbd',
  babyRabbit: '\uc544\uae30\ud1a0\ub07c',
  dog: '\uac15\uc544\uc9c0',
  rockHyrax: '\ubc14\uc704\ub108\uad6c\ub9ac',
  desertFox: '\uc0ac\ub9c9\uc5ec\uc6b0',
  lion: '\uc0ac\uc790',
  sheep: '\uc591',
  side: '\uc0ac\uc774\ub4dc\ubdf0',
  front: '\uc815\uba74',
  forest: '\uc232',
  wilderness: '\uad11\uc57c',
  highland: '\uace0\uc6d0',
  garden: '\ub3d9\uc0b0',
  flowerGarden: '\uaf43\ubc2d',
  nightSky: '\ubc24\ud558\ub298',
  guide: '\ub3c4\uac10',
  tree: '\ub098\ubb34',
  grass: '\ud480',
  ground: '\ub545',
  rock: '\ub3cc',
  preview: '\ud504\ub9ac\ubdf0',
  bg: '\ubc30\uacbd',
};

const lightBackdropRemovalOptions = {
  saturationMax: 0.45,
  lumaMin: 145,
  channelMin: 165,
  neutralChannelMin: 150,
  neutralSpreadMax: 70,
};

const animalAssets = [
  ['baby-rabbit-side.gif', ko.babyRabbit, `${ko.side}.gif`, 220],
  ['baby-rabbit-front.gif', ko.babyRabbit, `${ko.front}.gif`, 220],
  ['dog-side.gif', ko.dog, `${ko.side}.gif`, 220],
  ['dog-front.gif', ko.dog, `${ko.front}.gif`, 220],
  [
    'desert-fox-side.gif',
    desertFoxStableGifPath,
    null,
    280,
  ],
  ['desert-fox-front.gif', ko.desertFox, `${ko.front}.gif`, 220],
  ['rock-hyrax-side.gif', ko.rockHyrax, `${ko.side}.gif`, 240],
  ['rock-hyrax-front.gif', ko.rockHyrax, `${ko.front}.gif`, 240],
  ['lion-side.gif', ko.lion, `${ko.side}.gif`, 220],
  ['lion-front.gif', ko.lion, `${ko.front}.gif`, 240],
  ['sheep-side.gif', ko.sheep, `${ko.side}.gif`, 240],
  ['sheep-front.gif', ko.sheep, `${ko.front}.gif`, 240],
];

const mapAssets = [
  ['maps/forest/guide.png', ko.forest, `${ko.guide}.png`, 600],
  ['maps/forest/background.png', ko.forest, `${ko.forest}.png`, 680],
  ['maps/forest/still.png', ko.forest, `${ko.tree}.png`, 680],
  ['maps/forest/breeze.png', ko.forest, `${ko.grass}.png`, 680],
  ['maps/wilderness/guide.png', ko.wilderness, `${ko.guide}.png`, 600],
  ['maps/wilderness/background.png', ko.wilderness, `${ko.ground}.png`, 680],
  ['maps/wilderness/still.png', ko.wilderness, `${ko.rock}.png`, 680],
  ['maps/wilderness/breeze.png', ko.wilderness, `${ko.grass}.png`, 680],
  ['maps/highland/guide.png', ko.highland, 'preview_combined.png', 600],
  ['maps/highland/background.png', ko.highland, '01_base_highland_ground_path.png', 680],
  ['maps/highland/still.png', ko.highland, '02_terrain_mountains_stream_rocks.png', 680],
  ['maps/highland/breeze.png', ko.highland, '03_vegetation_olive_carmel_details.png', 680],
  ['maps/garden/guide.png', ko.garden, `${ko.preview}.png`, 600],
  ['maps/garden/background.png', ko.garden, `${ko.bg} 1.png`, 680],
  ['maps/garden/still.png', ko.garden, `${ko.bg} 2.png`, 680],
  ['maps/garden/breeze.png', ko.garden, `${ko.bg} 3.png`, 680],
  ['maps/flower-garden/guide.png', ko.flowerGarden, `${ko.preview}.png`, 600],
  ['maps/flower-garden/background.png', ko.flowerGarden, `${ko.bg}1.png`, 680],
  [
    'maps/flower-garden/still.png',
    ko.flowerGarden,
    `${ko.bg}2.png`,
    680,
    { removeLightBackdrop: lightBackdropRemovalOptions },
  ],
  [
    'maps/flower-garden/breeze.png',
    ko.flowerGarden,
    `${ko.bg}3.png`,
    680,
    { removeLightBackdrop: lightBackdropRemovalOptions },
  ],
  ['maps/night-sky/guide.png', ko.nightSky, `${ko.preview}.png`, 600],
  ['maps/night-sky/background.png', ko.nightSky, '1.png', 680],
  [
    'maps/night-sky/still.png',
    ko.nightSky,
    '2.png',
    680,
    { removeLightBackdrop: lightBackdropRemovalOptions },
  ],
  [
    'maps/night-sky/breeze.png',
    ko.nightSky,
    '3.png',
    680,
    { removeLightBackdrop: lightBackdropRemovalOptions },
  ],
];

function formatBytes(bytes) {
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function animalSource(nameOrPath, fileName) {
  if (fileName === null) {
    return nameOrPath;
  }

  return path.join(sourceRoot, ko.animal, nameOrPath, fileName);
}

function mapSource(folderName, fileName) {
  return path.join(sourceRoot, ko.background, folderName, fileName);
}

async function optimizeGif({ sourcePath, outputPath, width }) {
  const input = sharp(sourcePath, { animated: true, limitInputPixels: false });
  const metadata = await input.metadata();

  ensureDirectory(outputPath);
  await sharp(sourcePath, { animated: true, limitInputPixels: false })
    .resize({ width, withoutEnlargement: true })
    .gif({
      colours: 128,
      dither: 0,
      effort: 10,
      loop: metadata.loop ?? 0,
      delay: metadata.delay,
    })
    .toFile(outputPath);
}

function isLightBackdropPixel(red, green, blue, alpha, options) {
  if (alpha === 0) {
    return true;
  }

  const min = Math.min(red, green, blue);
  const max = Math.max(red, green, blue);
  const spread = max - min;
  const saturation = max === 0 ? 0 : spread / max;
  const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  if (saturation <= options.saturationMax && (luma >= options.lumaMin || min >= options.channelMin)) {
    return true;
  }

  return min >= options.neutralChannelMin && spread <= options.neutralSpreadMax;
}

async function removeLightBackdropBackground({ sourcePath, width, options }) {
  const { data, info } = await sharp(sourcePath, { limitInputPixels: false })
    .resize({ width, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(data);
  const { height } = info;
  const { width: outputWidth } = info;
  const visited = new Uint8Array(outputWidth * height);
  const stack = [];
  const pushCandidate = (x, y) => {
    if (x < 0 || y < 0 || x >= outputWidth || y >= height) {
      return;
    }

    const index = y * outputWidth + x;

    if (visited[index]) {
      return;
    }

    const offset = index * 4;

    if (!isLightBackdropPixel(pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3], options)) {
      return;
    }

    visited[index] = 1;
    stack.push(index);
  };

  for (let x = 0; x < outputWidth; x += 1) {
    pushCandidate(x, 0);
    pushCandidate(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    pushCandidate(0, y);
    pushCandidate(outputWidth - 1, y);
  }

  while (stack.length > 0) {
    const index = stack.pop();
    const offset = index * 4;
    const x = index % outputWidth;
    const y = Math.floor(index / outputWidth);

    pixels[offset + 3] = 0;
    pushCandidate(x + 1, y);
    pushCandidate(x - 1, y);
    pushCandidate(x, y + 1);
    pushCandidate(x, y - 1);
  }

  return { data: pixels, height, width: outputWidth };
}

async function optimizePng({
  sourcePath,
  outputPath,
  width,
  removeLightBackdrop = false,
  palette = false,
}) {
  ensureDirectory(outputPath);

  if (removeLightBackdrop) {
    const transparentImage = await removeLightBackdropBackground({
      sourcePath,
      width,
      options: removeLightBackdrop,
    });

    await sharp(transparentImage.data, {
      raw: {
        width: transparentImage.width,
        height: transparentImage.height,
        channels: 4,
      },
    })
      .png({
        adaptiveFiltering: true,
        compressionLevel: 9,
        effort: 10,
        palette,
      })
      .toFile(outputPath);
    return;
  }

  await sharp(sourcePath, { limitInputPixels: false })
    .resize({ width, withoutEnlargement: true })
    .png({
      adaptiveFiltering: true,
      compressionLevel: 9,
      effort: 10,
      palette,
    })
    .toFile(outputPath);
}

async function optimizePngInPlace(filePath, width, options = {}) {
  const tempPath = `${filePath}.tmp`;

  await optimizePng({ sourcePath: filePath, outputPath: tempPath, width, ...options });

  if (fs.statSync(tempPath).size < fs.statSync(filePath).size) {
    fs.renameSync(tempPath, filePath);
  } else {
    fs.unlinkSync(tempPath);
  }
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function runReleaseAssetPreparationScript(scriptName) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', scriptName)], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`${scriptName} failed with exit code ${result.status ?? 'unknown'}.`);
  }
}

function prepareReleaseAssetIntermediates() {
  runReleaseAssetPreparationScript('normalize-desert-fox-side-gif.cjs');
}

async function optimizeExistingPngDirectories() {
  const targets = [
    [path.join(outputRoot, 'trees'), 640],
    [path.join(outputRoot, 'tutorial'), 640],
    [path.join(outputRoot, 'forest'), 680],
    [path.join(outputRoot, 'collection'), 560],
    [path.join(outputRoot, 'diorama'), 1080, { palette: true }],
  ];

  for (const [directory, width, options = {}] of targets) {
    const files = walkFiles(directory).filter((filePath) => filePath.toLowerCase().endsWith('.png'));

    for (const filePath of files) {
      await optimizePngInPlace(filePath, width, options);
    }
  }
}

async function run() {
  const beforeBytes = [outputRoot, sourceRoot]
    .flatMap(walkFiles)
    .filter((filePath) => /\.(gif|png)$/i.test(filePath))
    .reduce((total, filePath) => total + fs.statSync(filePath).size, 0);

  prepareReleaseAssetIntermediates();

  for (const [outputName, animalNameOrPath, fileName, width] of animalAssets) {
    await optimizeGif({
      sourcePath: animalSource(animalNameOrPath, fileName),
      outputPath: path.join(outputRoot, 'animals', outputName),
      width,
    });
  }

  for (const [outputName, folderName, fileName, width, options = {}] of mapAssets) {
    await optimizePng({
      sourcePath: mapSource(folderName, fileName),
      outputPath: path.join(outputRoot, outputName),
      width,
      ...options,
    });
  }

  await optimizeExistingPngDirectories();

  const releaseBytes = walkFiles(outputRoot)
    .filter((filePath) => /\.(gif|png)$/i.test(filePath))
    .reduce((total, filePath) => total + fs.statSync(filePath).size, 0);

  console.log(
    JSON.stringify(
      {
        sourceAndAssetImagesBefore: formatBytes(beforeBytes),
        optimizedReleaseAssets: formatBytes(releaseBytes),
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
