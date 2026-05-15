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
  const binaryString = atob(compressedMask);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const decompressed = pako.ungzip(bytes);
  return new Uint8Array(decompressed.buffer);
};

// Function to draw the segmentation output with overlay
export const drawSegmentationOutput: RendererFunction<Segments> = async (
  ctx: CanvasRenderingContext2D,
  input: string,
  width: number,
  height: number,
  detections: Segments,
  roi: [number, number, number, number],
  options: RendererOptions = DEFAULT_OPTIONS
) => {
  // const { inputImage, labels } = { ...DEFAULT_OPTIONS, ...options };
  const { inputImage } = { ...DEFAULT_OPTIONS, ...options };

  if (inputImage) {
    await drawInputImage(ctx, input, width, height);
  }

  const [maskHeight, maskWidth] = detections.mask_shape;
  const maskArray = decompressMask(detections.mask);

  const imageData = ctx.getImageData(0, 0, width, height);
  const widthRatio = maskWidth / (roi[2] * width);
  const heightRatio = maskHeight / (roi[3] * height);

  const start_x = Math.floor(roi[0] * width);
  const start_y = Math.floor(roi[1] * height);
  const end_x = start_x + Math.floor(roi[2] * width);
  const end_y = start_y + Math.floor(roi[3] * height);

  for (let y = start_y; y < end_y; y++) {
    for (let x = start_x; x < end_x; x++) {
      
      const srcY = Math.floor((y - start_y) * heightRatio) * maskWidth;
      const srcX = Math.floor((x - start_x) * widthRatio);
      const segmentIndex = maskArray[srcY + srcX];

      if (segmentIndex !== 255) { // -1 / 255 represents background
        const color = COLOR_PALETTE[segmentIndex];
        const alpha = 0.4;

        const pos = (y * width + x) * 4;
        imageData.data[pos] = (1 - alpha) * imageData.data[pos] + alpha * color.r;
        imageData.data[pos + 1] = (1 - alpha) * imageData.data[pos + 1] + alpha * color.g;
        imageData.data[pos + 2] = (1 - alpha) * imageData.data[pos + 2] + alpha * color.b;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

export default drawSegmentationOutput;
