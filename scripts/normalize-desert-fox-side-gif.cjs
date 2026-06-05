const fs = require('fs');
const path = require('path');

let GifFrame;
let GifUtil;

try {
  ({ GifFrame, GifUtil } = require('gifwrap'));
} catch (error) {
  const tempToolPath =
    process.env.TEMP && path.join(process.env.TEMP, 'blessie-gif-tools', 'node_modules', 'gifwrap');

  try {
    ({ GifFrame, GifUtil } = require(tempToolPath));
  } catch {
    console.error('Missing gifwrap. Install it with: npm.cmd install --prefix "$env:TEMP\\blessie-gif-tools" gifwrap');
    process.exit(1);
  }
}

const repoRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(repoRoot, 'Logo', 'forest asset');
const intermediateRoot = path.join(repoRoot, '.codex-diagnostics', 'release-assets');
const outputPath = path.join(
  intermediateRoot,
  'desert-fox-side-stable.gif',
);

const sourceSignature = {
  width: 1280,
  height: 720,
  frames: 300,
};

const alphaThreshold = 16;
const corruptedOpeningFrameCount = 2;

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

async function findSourceGif() {
  const gifPaths = walkFiles(sourceRoot).filter((candidate) =>
    candidate.toLowerCase().endsWith('.gif'),
  );

  for (const gifPath of gifPaths) {
    const gif = await GifUtil.read(gifPath);
    const firstFrame = gif.frames[0];

    if (
      gif.frames.length === sourceSignature.frames &&
      firstFrame.bitmap.width === sourceSignature.width &&
      firstFrame.bitmap.height === sourceSignature.height
    ) {
      return { gif, gifPath };
    }
  }

  throw new Error('Could not find the 1280x720 300-frame desert fox side GIF.');
}

function getContentBounds(bitmap) {
  const { data, width, height } = bitmap;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width * 4;

    for (let x = 0; x < width; x += 1) {
      const alpha = data[rowOffset + x * 4 + 3];

      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    return { x: 0, y: 0, width, height, bottom: height - 1 };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    bottom: maxY,
  };
}

function getFrameVisualBounds(frame) {
  const bounds = getContentBounds(frame.bitmap);

  return {
    x: bounds.x + frame.xOffset,
    y: bounds.y + frame.yOffset,
    width: bounds.width,
    height: bounds.height,
    bottom: bounds.bottom + frame.yOffset,
  };
}

function getFrameAnchor(frame) {
  const bounds = getFrameVisualBounds(frame);

  return {
    bottom: bounds.bottom,
    centerX: bounds.x + bounds.width / 2,
  };
}

function getMedian(values) {
  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);

  return sortedValues.length % 2 === 0
    ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
    : sortedValues[middleIndex];
}

function copyOriginalFrame(frame, targetAnchor) {
  const source = frame.bitmap;
  const outputWidth = sourceSignature.width;
  const outputHeight = sourceSignature.height;
  const output = Buffer.alloc(outputWidth * outputHeight * 4);
  const anchor = getFrameAnchor(frame);
  const shiftX = Math.round(targetAnchor.centerX - anchor.centerX);
  const shiftY = Math.round(targetAnchor.bottom - anchor.bottom);

  for (let y = 0; y < source.height; y += 1) {
    const targetY = y + frame.yOffset + shiftY;

    if (targetY < 0 || targetY >= outputHeight) {
      continue;
    }

    for (let x = 0; x < source.width; x += 1) {
      const targetX = x + frame.xOffset + shiftX;

      if (targetX < 0 || targetX >= outputWidth) {
        continue;
      }

      const sourceIndex = (y * source.width + x) * 4;
      const targetIndex = (targetY * outputWidth + targetX) * 4;
      const alpha = source.data[sourceIndex + 3];

      if (alpha <= alphaThreshold) {
        continue;
      }

      output[targetIndex] = source.data[sourceIndex];
      output[targetIndex + 1] = source.data[sourceIndex + 1];
      output[targetIndex + 2] = source.data[sourceIndex + 2];
      output[targetIndex + 3] = alpha;
    }
  }

  return output;
}

function normalizeFrame(frame, targetAnchor, delayCentisecs) {
  const outputWidth = sourceSignature.width;
  const outputHeight = sourceSignature.height;
  const output = copyOriginalFrame(frame, targetAnchor);

  return new GifFrame(outputWidth, outputHeight, output, {
    delayCentisecs: delayCentisecs || frame.delayCentisecs || 3,
    disposalMethod: GifFrame.DisposeToBackgroundColor,
    interlaced: false,
  });
}

function summarizeBounds(bounds) {
  const widths = bounds.map((entry) => entry.width);
  const heights = bounds.map((entry) => entry.height);

  return {
    minWidth: Math.min(...widths),
    maxWidth: Math.max(...widths),
    minHeight: Math.min(...heights),
    maxHeight: Math.max(...heights),
  };
}

async function main() {
  const { gif, gifPath } = await findSourceGif();
  const sourceBounds = gif.frames.map((frame) => getFrameVisualBounds(frame));
  const stableFrames = gif.frames.slice(corruptedOpeningFrameCount);
  const targetAnchor = {
    bottom: Math.round(getMedian(stableFrames.map((frame) => getFrameAnchor(frame).bottom))),
    centerX: Math.round(getMedian(stableFrames.map((frame) => getFrameAnchor(frame).centerX))),
  };
  const outputFrames = gif.frames.map((frame, frameIndex) => {
    const sourceFrame =
      frameIndex < corruptedOpeningFrameCount
        ? gif.frames[corruptedOpeningFrameCount]
        : frame;

    return normalizeFrame(sourceFrame, targetAnchor, frame.delayCentisecs);
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await GifUtil.write(outputPath, outputFrames, { loops: gif.loops ?? 0 });

  const outputBounds = outputFrames.map((frame) => getFrameVisualBounds(frame));
  const durationMs = outputFrames.reduce(
    (total, frame) => total + (frame.delayCentisecs || 0) * 10,
    0,
  );

  console.log(JSON.stringify({
    source: path.relative(repoRoot, gifPath),
    output: path.relative(repoRoot, outputPath),
    frames: outputFrames.length,
    durationMs,
    before: summarizeBounds(sourceBounds),
    after: summarizeBounds(outputBounds),
  }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
