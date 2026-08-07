import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

function drawLopesHeartIcon(size) {
  const png = new PNG({ width: size, height: size });

  // Color definitions
  const bgR = 255, bgG = 255, bgB = 255, bgA = 255; // White background
  const heartR = 241, heartG = 15, heartB = 77, heartA = 255; // #F10F4D

  // Fill white background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = bgR;
      png.data[idx + 1] = bgG;
      png.data[idx + 2] = bgB;
      png.data[idx + 3] = bgA;
    }
  }

  // Draw Heart + Circle head emblem centered
  const scale = size / 100;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Map pixel to 100x100 space
      const x = px / scale;
      const y = py / scale;

      let inShape = false;

      // 1. Circle head at cx=74, cy=30, r=17.5
      const dxCircle = x - 74;
      const dyCircle = y - 30;
      if (dxCircle * dxCircle + dyCircle * dyCircle <= 17.5 * 17.5) {
        inShape = true;
      }

      // 2. Main Heart Body (implicit curve approximation)
      // Left lobe center roughly (34, 32), r=22
      // Bottom tip pointing to (48, 88)
      if (!inShape) {
        // Distance to left circle lobe
        const dxL = x - 34;
        const dyL = y - 32;
        if (dxL * dxL + dyL * dyL <= 22 * 22) {
          inShape = true;
        }

        // Lower heart triangle/curved body
        if (y >= 32 && y <= 88) {
          const progress = (y - 32) / (88 - 32); // 0 at top, 1 at tip
          const minX = 12 + progress * 34;
          const maxX = 74 - progress * 26;
          
          // Crescent notch cut out for the circle head on upper right
          const dxCut = x - 74;
          const dyCut = y - 30;
          const inNotch = (dxCut * dxCut + dyCut * dyCut <= 21 * 21);

          if (x >= minX && x <= maxX && !inNotch) {
            inShape = true;
          }
        }
      }

      if (inShape) {
        const idx = (size * py + px) << 2;
        png.data[idx] = heartR;
        png.data[idx + 1] = heartG;
        png.data[idx + 2] = heartB;
        png.data[idx + 3] = heartA;
      }
    }
  }

  return png;
}

const publicDir = path.join(process.cwd(), 'public');

[192, 512].forEach((size) => {
  const icon = drawLopesHeartIcon(size);
  const buffer = PNG.sync.write(icon);
  const filePath = path.join(publicDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated ${filePath}`);
});
