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
import { Anomaly, RendererFunction, RendererOptions } from "../interfaces/DetectionInterfaces";


const DEFAULT_OPTIONS: RendererOptions = {
  inputImage: true,
  labels: null,
  threshold: 0.3,
  pixel_threshold: 0.3
};

interface RGB {
  r: number;
  g: number;
  b: number;
}

// Function to decode the base64 encoded mask
const decompressMask = (compressedMask: string): Float32Array => {
  const binaryString = atob(compressedMask);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const decompressed = pako.ungzip(bytes);
  return new Float32Array(decompressed.buffer);
};


export const drawAnomalyOutput: RendererFunction<Anomaly> = async (
  ctx: CanvasRenderingContext2D,
  input: string,
  width: number,
  height: number,
  detections: Anomaly,
  roi: [number, number, number, number],
  options: RendererOptions = DEFAULT_OPTIONS
) => {
  
  const { inputImage, threshold, pixel_threshold } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  
  if (inputImage) {
      await drawInputImage(ctx, input, width, height);
  }
  
  const [heatmapHeight, heatmapWidth] = detections.heatmap_shape;
  const heatmapArray = decompressMask(detections.heatmap);
  
  const imageData = ctx.getImageData(0, 0, width, height);
  const widthRatio = heatmapWidth / (roi[2] * width);
  const heightRatio = heatmapHeight / (roi[3] * height);
  
  const start_x = Math.floor(roi[0] * width);
  const start_y = Math.floor(roi[1] * height);
  const end_x = start_x + Math.floor(roi[2] * width);
  const end_y = start_y + Math.floor(roi[3] * height);
  
  const color: RGB = detections.score >= threshold ? { r: 255, g: 0, b: 0 } : { r: 128, g: 128, b: 128 };
  const alpha = 0.3;
  
  for (let y = start_y; y < end_y; y++) {
    for (let x = start_x; x < end_x; x++) {
      
      const srcY = Math.floor((y - start_y) * heightRatio) * heatmapWidth;
      const srcX = Math.floor((x - start_x) * widthRatio);
      const value = heatmapArray[srcY + srcX];

      if (value >= pixel_threshold) {
        const pos = (y * width + x) * 4;
        imageData.data[pos] = (1 - alpha) * imageData.data[pos] + alpha * color.r;
        imageData.data[pos + 1] = (1 - alpha) * imageData.data[pos + 1] + alpha * color.g;
        imageData.data[pos + 2] = (1 - alpha) * imageData.data[pos + 2] + alpha * color.b;
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);

  // Draw the anomaly score text
  ctx.font = "16px sans-serif";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(`Anomaly score: ${(detections.score).toFixed(4)}`, 4, 4);
};

export default drawAnomalyOutput;