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

export interface Classifications {
  confidence: number[];
  class_id: number[];
}

export interface Detections {
  bbox: number[][];
  confidence: number[];
  class_id: number[];
  tracker_id: number[] | null;
}

export interface Segments {
  n_segments: number;
  indeces: number[];
  mask: string;
}

export interface Poses {
  n_detections: number;
  scores: number[];
  keypoints: number[][];
  keypoint_scores: number[][];
}

export interface FrameData {
  image: string;
  detections: Classifications & Detections & Segments & Poses;
  width: number;
  height: number;
}

export interface RendererOptions {
  inputImage: boolean;
  labels?: string[] | null;
  threshold?: number;
}

export type RendererFunction<T> = (
  ctx: CanvasRenderingContext2D,
  input: string,
  width: number,
  height: number,
  detections?: T,
  options?: RendererOptions
) => Promise<void>;