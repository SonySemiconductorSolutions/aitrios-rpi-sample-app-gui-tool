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
  threshold: 0.5,
};

export const drawObjectDetectionOutput: RendererFunction<Detections> = async (
  ctx: CanvasRenderingContext2D,
  input: string,
  width: number,
  height: number,
  detections: Detections,
  options: RendererOptions = DEFAULT_OPTIONS
) => {
  // const { bbox, confidence, class_id, tracker_id } = detections;
  const { bbox, confidence, class_id } = detections;
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

    const [x1, y1, x2, y2] = bbox[i].map((coord) => (coord <= 1.0 ? coord : 1.0));

    const img_x1 = Math.round(x1 * width);
    const img_y1 = Math.round(y1 * height);
    const img_x2 = Math.round(x2 * width);
    const img_y2 = Math.round(y2 * height);

    // This code snippet (stringToColour) is based on content from Stack Overflow.
    // Original question: https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
    // Answer by: [Joe Freeman](https://stackoverflow.com/users/108907/joe-freeman)
    // Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
    const stringToColour = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      let colour = "#";
      for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        colour += ("00" + value.toString(16)).substr(-2);
      }
      return colour;
    };

    // Check if labels is null or empty and handle it
    const label = labels && labels.length ? labels[class_id[i]] : class_id[i];
    const color = stringToColour(label.toString());

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
