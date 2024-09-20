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
import { Classifications, RendererFunction, RendererOptions } from "../interfaces/DetectionInterfaces";


const DEFAULT_OPTIONS: RendererOptions = {
  inputImage: true,
  labels: null,
};

export const drawClassificationOutput: RendererFunction<Classifications> = async (
  ctx: CanvasRenderingContext2D,
  input: string,
  width: number,
  height: number,
  detections: Classifications,
  options: RendererOptions = DEFAULT_OPTIONS
) => {
  const predictionsNum = 5;
  const { inputImage, labels } = {
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

  const textHeight = parseInt(font, 10); // base 10

  for (let i = 0; i < predictionsNum; i++) {
    const index = detections.class_id[i];
    const score = detections.confidence[i];
    const label = labels && labels.length ? labels[index] : index.toString();
    const text = `${label}: ${(100 * score).toFixed(2)}%`;

    // Draw the text
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(text, 4, i * textHeight + 4);
  }
};

export default drawClassificationOutput;
