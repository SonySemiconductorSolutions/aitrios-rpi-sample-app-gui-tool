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
import { Poses, RendererFunction, RendererOptions } from "../interfaces/DetectionInterfaces";


const DEFAULT_OPTIONS: RendererOptions = {
  inputImage: true,
};

const skeleton = [
  [5, 6],
  [11, 12],
  [5, 7],
  [7, 9],
  [5, 11],
  [11, 13],
  [13, 15],
  [6, 8],
  [8, 10],
  [6, 12],
  [12, 14],
  [14, 16],
];

const drawKeypoints = (
  ctx: CanvasRenderingContext2D,
  keypoints: number[][],
  keypointScores: number[][],
  poseIdx: number,
  keypointIdx: number,
  scaleX: number,
  scaleY: number,
  radius: number,
  threshold: number
) => {
  if (keypointScores[poseIdx][keypointIdx] >= threshold) {
    const y = keypoints[poseIdx][2 * keypointIdx] * scaleY;
    const x = keypoints[poseIdx][2 * keypointIdx + 1] * scaleX;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0, 255, 0, 1)";
    ctx.fill();
  }
};

const drawLine = (
  ctx: CanvasRenderingContext2D,
  keypoints: number[][],
  keypointScores: number[][],
  poseIdx: number,
  keypoint1: number,
  keypoint2: number,
  scaleX: number,
  scaleY: number,
  threshold: number
) => {
  if (keypointScores[poseIdx][keypoint1] >= threshold && keypointScores[poseIdx][keypoint2] >= threshold) {
    const y1 = keypoints[poseIdx][2 * keypoint1] * scaleY;
    const x1 = keypoints[poseIdx][2 * keypoint1 + 1] * scaleX;
    const y2 = keypoints[poseIdx][2 * keypoint2] * scaleY;
    const x2 = keypoints[poseIdx][2 * keypoint2 + 1] * scaleX;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = "rgba(0, 255, 255, 1)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

const drawSkeleton = (
  ctx: CanvasRenderingContext2D,
  keypoints: number[][],
  keypointScores: number[][],
  poseIdx: number,
  scaleX: number,
  scaleY: number,
  threshold: number
) => {
  skeleton.forEach(([keypoint1, keypoint2]) => {
    drawLine(ctx, keypoints, keypointScores, poseIdx, keypoint1, keypoint2, scaleX, scaleY, threshold);
  });
};

export const drawPoseEstimationOutput: RendererFunction<Poses> = async (
  ctx: CanvasRenderingContext2D,
  input: string,
  width: number,
  height: number,
  detections: Poses,
  options: RendererOptions = DEFAULT_OPTIONS
) => {
  const keypointRadius = 3
  const keypointScoreThreshold = 0.5;
  const { inputImage } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (inputImage) {
    await drawInputImage(ctx, input, width, height);
  }

  const scaleX = height;
  const scaleY = width;

  for (let i = 0; i < detections.n_detections; i++) {
    if (detections.scores[i] > keypointScoreThreshold) {
      for (let j = 0; j < 17; j++) {
        drawKeypoints(ctx, detections.keypoints, detections.keypoint_scores, i, j, scaleX, scaleY, keypointRadius, keypointScoreThreshold);
      }
      drawSkeleton(ctx, detections.keypoints, detections.keypoint_scores, i, scaleX, scaleY, keypointScoreThreshold);
    }
  }
};

export default drawPoseEstimationOutput;
