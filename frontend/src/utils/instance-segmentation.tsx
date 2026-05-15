/*
 * Copyright 2026 Sony Semiconductor Solutions Corp. All rights reserved.
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
import { InstanceSegments, RendererFunction, RendererOptions } from "../interfaces/DetectionInterfaces";


const DEFAULT_OPTIONS: RendererOptions = {
  inputImage: true,
  labels: null,
  threshold: 0.3,
};

// Function to generate color from string (same as object-detection.tsx)
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

// Function to convert hex color to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

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

// Function to draw the instance segmentation output with overlay
export const drawInstanceSegmentationOutput: RendererFunction<InstanceSegments> = async (
  ctx: CanvasRenderingContext2D,
  input: string,
  width: number,
  height: number,
  detections: InstanceSegments,
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

  // Handle null bbox case
  if (!bbox || bbox.length === 0) {
    return;
  }

  // Extract mask dimensions: mask_shape is [N, W, H]
  const [nInstances, maskWidth, maskHeight] = detections.mask_shape;
  const maskArray = decompressMask(detections.mask);

  // Get image data for mask overlay
  const imageData = ctx.getImageData(0, 0, width, height);
  const widthRatio = maskWidth / (roi[2] * width);
  const heightRatio = maskHeight / (roi[3] * height);

  const start_x = Math.floor(roi[0] * width);
  const start_y = Math.floor(roi[1] * height);
  const end_x = start_x + Math.floor(roi[2] * width);
  const end_y = start_y + Math.floor(roi[3] * height);

  // Font options for labels
  const font = "16px sans-serif";
  ctx.font = font;
  ctx.textBaseline = "top";

  // First pass: Draw all mask overlays
  for (let i = 0; i < nInstances && i < bbox.length; i++) {
    // Filter by confidence threshold
    if (confidence[i] < threshold) continue;

    // Get label and color for this instance
    const label = labels && labels.length ? labels[class_id[i]] : class_id[i];
    const colorHex = generateColorFromString(label.toString());
    const color = hexToRgb(colorHex);

    // Extract the i-th mask from the array
    // Each mask is of size maskWidth * maskHeight
    const maskStartIdx = i * maskWidth * maskHeight;
    const maskEndIdx = (i + 1) * maskWidth * maskHeight;

    // Draw mask overlay
    const alpha = 0.4;
    for (let y = start_y; y < end_y; y++) {
      for (let x = start_x; x < end_x; x++) {
        const srcY = Math.floor((y - start_y) * heightRatio);
        const srcX = Math.floor((x - start_x) * widthRatio);
        const maskIdx = maskStartIdx + srcY * maskWidth + srcX;

        // Check bounds and if pixel is part of this instance mask
        if (maskIdx >= maskStartIdx && maskIdx < maskEndIdx) {
          const maskValue = maskArray[maskIdx];
          // Binary mask: UInt8 values, 255 (or > 0) means pixel belongs to this instance, 0 means it doesn't
          if (maskValue > 0) {
            const pos = (y * width + x) * 4;
            imageData.data[pos] = (1 - alpha) * imageData.data[pos] + alpha * color.r;
            imageData.data[pos + 1] = (1 - alpha) * imageData.data[pos + 1] + alpha * color.g;
            imageData.data[pos + 2] = (1 - alpha) * imageData.data[pos + 2] + alpha * color.b;
          }
        }
      }
    }
  }

  // Put the modified image data back to canvas (masks drawn first)
  ctx.putImageData(imageData, 0, 0);

  // Second pass: Draw bounding boxes and labels on top
  for (let i = 0; i < nInstances && i < bbox.length; i++) {
    // Filter by confidence threshold
    if (confidence[i] < threshold) continue;

    // Get label and color for this instance
    const label = labels && labels.length ? labels[class_id[i]] : class_id[i];
    const colorHex = generateColorFromString(label.toString());

    // Draw bounding box
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

    // Draw the bounding box
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 2;
    ctx.strokeRect(img_x1, img_y1, img_x2 - img_x1, img_y2 - img_y1);

    // Draw label and confidence
    const text = label + ": " + (100 * confidence[i]).toFixed(2) + "%";

    // Draw the label background
    ctx.fillStyle = colorHex;
    const textWidth = ctx.measureText(text).width;
    const textHeight = parseInt(font, 10); // base 10
    ctx.fillRect(img_x1, img_y1, textWidth + 4, textHeight + 4);

    // Draw the text
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(text, img_x1, img_y1);
  }
};

export default drawInstanceSegmentationOutput;
