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

import drawInputImage from "./input-image";
import { Detections, RendererFunction, RendererOptions } from "../interfaces/DetectionInterfaces";


const DEFAULT_OPTIONS: RendererOptions = {
  inputImage: true,
  labels: null,
  threshold: 0.3,
};

const generateColorFromString = (input: string) => {
  let accumulatedHash = 0;
  let hexColor = "#";

  for (let i = 0; i < input.length; i++) {
    accumulatedHash = input.charCodeAt(i) + ((accumulatedHash << 5) - accumulatedHash);
  }

  for (let i = 0; i < 3; i++) {
    hexColor += ("00" + ((accumulatedHash >> (i * 8)) & 0xff).toString(16)).slice(-2);
  }

  return hexColor;
};

export const drawObjectDetectionOutput: RendererFunction<Detections> = async (
  ctx: CanvasRenderingContext2D,
  input: string,
  width: number,
  height: number,
  detections: Detections,
  roi: [number, number, number, number],
  options: RendererOptions = DEFAULT_OPTIONS
) => {
  const { bbox, confidence, class_id, _roi_compensated } = detections;
  const { labels, threshold, inputImage } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (inputImage) {
    await drawInputImage(ctx, input, width, height);
  }

  // Font options
  const font = "16px sans-serif";
  ctx.font = font;
  ctx.textBaseline = "top";

  for (let i = 0; i < bbox.length; i++) {
    if (confidence[i] < threshold) continue;

    let [x1, y1, x2, y2] = bbox[i].map((coord) => (coord <= 1.0 ? coord : 1.0));

    // Compensate for ROI when needed
    if (!(roi[0] === 0 && roi[1] === 0 && roi[2] === 1 && roi[3] === 1) && !_roi_compensated) {
      x1 = roi[0] + x1 * roi[2];
      y1 = roi[1] + y1 * roi[3];
      x2 = roi[0] + x2 * roi[2];
      y2 = roi[1] + y2 * roi[3];
    }

    const img_x1 = Math.round(x1 * width);
    const img_y1 = Math.round(y1 * height);
    const img_x2 = Math.round(x2 * width);
    const img_y2 = Math.round(y2 * height);

    // Check if labels is null or empty and handle it
    const label = labels && labels.length ? labels[class_id[i]] : class_id[i];
    const color = generateColorFromString(label.toString());

    // Draw the bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(img_x1, img_y1, img_x2 - img_x1, img_y2 - img_y1);

    const text = label + ": " + (100 * confidence[i]).toFixed(2) + "%";

    // Draw the label background
    ctx.fillStyle = color;
    const textWidth = ctx.measureText(text).width;
    const textHeight = parseInt(font, 10); // base 10
    ctx.fillRect(img_x1, img_y1, textWidth + 4, textHeight + 4);

    // Draw the text
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(text, img_x1, img_y1);
  }
};

export default drawObjectDetectionOutput;
