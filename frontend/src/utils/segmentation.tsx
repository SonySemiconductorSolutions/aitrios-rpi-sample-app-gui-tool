/*
 * Copyright 2024 Sony Semiconductor Solutions Corp. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import pako from "pako";
import drawInputImage from "./input-image";
import { Segments, RendererFunction, RendererOptions } from "../interfaces/DetectionInterfaces";


const DEFAULT_OPTIONS: RendererOptions = {
  inputImage: true,
  labels: null,
};

interface RGB {
  r: number;
  g: number;
  b: number;
}

const COLOR_PALETTE: RGB[] = [
  { r: 0, g: 0, b: 0 },
  { r: 128, g: 0, b: 0 },
  { r: 0, g: 128, b: 0 },
  { r: 128, g: 128, b: 0 },
  { r: 0, g: 0, b: 128 },
  { r: 128, g: 0, b: 128 },
  { r: 0, g: 128, b: 128 },
  { r: 128, g: 128, b: 128 },
  { r: 64, g: 0, b: 0 },
  { r: 192, g: 0, b: 0 },
  { r: 64, g: 128, b: 0 },
  { r: 192, g: 128, b: 0 },
  { r: 64, g: 0, b: 128 },
  { r: 192, g: 0, b: 128 },
  { r: 64, g: 128, b: 128 },
  { r: 192, g: 128, b: 128 },
  { r: 0, g: 64, b: 0 },
  { r: 128, g: 64, b: 0 },
  { r: 0, g: 192, b: 0 },
  { r: 128, g: 192, b: 0 },
  { r: 0, g: 64, b: 128 },
];

// Function to decode the base64 encoded mask
const decompressMask = (compressedMask: string): Uint8Array => {
  const binaryString = window.atob(compressedMask);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Uint8Array(pako.inflate(bytes));
};

// Function to draw the segmentation output with overlay
export const drawSegmentationOutput: RendererFunction<Segments> = async (
  ctx: CanvasRenderingContext2D,
  input: string,
  width: number,
  height: number,
  detections: Segments,
  options: RendererOptions = DEFAULT_OPTIONS
) => {
  const maskWidth = 320;
  const maskHeight = 320;
  // const { inputImage, labels } = { ...DEFAULT_OPTIONS, ...options };
  const { inputImage} = { ...DEFAULT_OPTIONS, ...options };

  if (inputImage) {
    await drawInputImage(ctx, input, width, height);
  }

  const decodedMask = decompressMask(detections.mask);
  const maskArray = new Uint8Array(decodedMask.buffer);

  const overlay = ctx.createImageData(width, height);
  const widthRatio = maskWidth / width;
  const heightRatio = maskHeight / height;

  for (let y = 0; y < height; y++) {
    const srcY = Math.floor(y * heightRatio) * maskWidth;
    for (let x = 0; x < width; x++) {
      const srcX = Math.floor(x * widthRatio);
      const segmentIndex = maskArray[srcY + srcX];

      const pos = (y * width + x) * 4;
      if (segmentIndex !== 0) {
        const color = COLOR_PALETTE[segmentIndex];
        overlay.data[pos] = color.r;
        overlay.data[pos + 1] = color.g;
        overlay.data[pos + 2] = color.b;
        overlay.data[pos + 3] = 150; // Alpha value for transparency
      }
    }
  }

  // Blend the overlay with the original image
  const imageData = ctx.getImageData(0, 0, width, height);
  const overlayData = overlay.data;
  const imageDataData = imageData.data;

  for (let i = 0; i < overlayData.length; i += 4) {
    const alpha = overlayData[i + 3] / 255;
    const invAlpha = 1 - alpha;
    imageDataData[i] = invAlpha * imageDataData[i] + alpha * overlayData[i];
    imageDataData[i + 1] = invAlpha * imageDataData[i + 1] + alpha * overlayData[i + 1];
    imageDataData[i + 2] = invAlpha * imageDataData[i + 2] + alpha * overlayData[i + 2];
  }

  ctx.putImageData(imageData, 0, 0);
};

export default drawSegmentationOutput;
