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
const outputPath = path.join(
  repoRoot,
  'assets',
  'images',
  'praybor',
  'animals',
  'desert-fox-side-stable.gif',
);

const sourceSignature = {
  width: 1280,
  height: 720,
  frames: 300,
};

const alphaThreshold = 16;
const sittingMaxHeight = 650;
const sittingWindowsMs = [
  { startMs: 0, endMs: 900 },
  { startMs: 8000, endMs: 10000 },
];

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

function isSittingFrame(elapsedMs) {
  return sittingWindowsMs.some((window) => elapsedMs >= window.startMs && elapsedMs < window.endMs);
}

function copyOriginalFrame(frame) {
  const source = frame.bitmap;
  const outputWidth = sourceSignature.width;
  const outputHeight = sourceSignature.height;
  const output = Buffer.alloc(outputWidth * outputHeight * 4);

  for (let y = 0; y < source.height; y += 1) {
    const targetY = y + frame.yOffset;

    if (targetY < 0 || targetY >= outputHeight) {
      continue;
    }

    for (let x = 0; x < source.width; x += 1) {
      const targetX = x + frame.xOffset;

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
      output[targetIndex + 3] = 255;
    }
  }

  return output;
}

function scaleSittingFrame(frame) {
  const source = frame.bitmap;
  const outputWidth = sourceSignature.width;
  const outputHeight = sourceSignature.height;
  const output = Buffer.alloc(outputWidth * outputHeight * 4);
  const localBounds = getContentBounds(source);
  const globalBounds = getFrameVisualBounds(frame);
  const scale = Math.min(1, sittingMaxHeight / Math.max(1, globalBounds.height));
  const targetWidth = Math.max(1, Math.round(globalBounds.width * scale));
  const targetHeight = Math.max(1, Math.round(globalBounds.height * scale));
  const targetLeft = Math.round(globalBounds.x + globalBounds.width / 2 - targetWidth / 2);
  const targetTop = Math.round(globalBounds.bottom - targetHeight + 1);

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY =
      localBounds.y + Math.min(localBounds.height - 1, Math.floor(((y + 0.5) * localBounds.height) / targetHeight));
    const targetY = targetTop + y;

    if (targetY < 0 || targetY >= outputHeight) {
      continue;
    }

    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX =
        localBounds.x + Math.min(localBounds.width - 1, Math.floor(((x + 0.5) * localBounds.width) / targetWidth));
      const targetX = targetLeft + x;

      if (targetX < 0 || targetX >= outputWidth) {
        continue;
      }

      const sourceIndex = (sourceY * source.width + sourceX) * 4;
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

function normalizeFrame(frame, elapsedMs) {
  const outputWidth = sourceSignature.width;
  const outputHeight = sourceSignature.height;
  const output = isSittingFrame(elapsedMs) ? scaleSittingFrame(frame) : copyOriginalFrame(frame);

  return new GifFrame(outputWidth, outputHeight, output, {
    delayCentisecs: frame.delayCentisecs || 3,
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
  let elapsedMs = 0;
  const outputFrames = gif.frames.map((frame) => {
    const outputFrame = normalizeFrame(frame, elapsedMs);
    elapsedMs += (frame.delayCentisecs || 0) * 10;

    return outputFrame;
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
