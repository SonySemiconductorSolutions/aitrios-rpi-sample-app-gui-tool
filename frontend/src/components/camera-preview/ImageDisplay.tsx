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

import { useState, useEffect, useRef, useCallback } from "react";
import { Container, Box, Button, Collapse, Divider, Typography, IconButton, Tooltip } from "@mui/material";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import FullscreenIcon from "@mui/icons-material/Fullscreen";

import { drawInputImage } from "../../utils/input-image";
import { drawClassificationOutput } from "../../utils/classification";
import { drawObjectDetectionOutput } from "../../utils/object-detection";
import { drawPoseEstimationOutput } from "../../utils/pose-estimation";
import { drawSegmentationOutput } from "../../utils/segmentation";
import { drawInstanceSegmentationOutput } from "../../utils/instance-segmentation";
import { drawAnomalyOutput } from "../../utils/anomaly";
import useHttpNotifications from "../../hooks/use-http-notifications";
import { Socket } from "socket.io-client";
import { NetworkData } from "../../interfaces/CustomNetworkInterfaces";
import { Classifications, Detections, Poses, Segments, InstanceSegments, Anomaly, FrameData, RendererFunction, RendererOptions } from "../../interfaces/DetectionInterfaces";
import CameraControls from "./CameraControls";

const BACKEND_HOST = import.meta.env.REACT_APP_BACKEND_HOST ?? "";

interface ImageDisplayProps {
  socket: Socket;
  initial_collection?: string;
  initial_expanded?: boolean;
}

export type RendererFunctions =
  | RendererFunction<Classifications>
  | RendererFunction<Detections>
  | RendererFunction<Poses>
  | RendererFunction<Segments>
  | RendererFunction<InstanceSegments>
  | RendererFunction<Anomaly>

type Collection = {
    collection_name: string;
    n_images: number;
  };


const ImageDisplay = ({ socket, initial_collection, initial_expanded }: ImageDisplayProps) => {
  const { sendRequest } = useHttpNotifications();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [labels, setLabels] = useState<string[] | null>(null);
  const [width, setWidth] = useState(640);
  const [height, setHeight] = useState(640);
  const [expanded, setExpanded] = useState(initial_expanded);
  const thresholdRef = useRef<number>(0.3);
  const pixelThresholdRef = useRef<number>(0.3);
  const keypointScoreThresholdRef = useRef<number>(0.5);
  const fpsRef = useRef<number>(0);
  const dpsRef = useRef<number>(0);
  const showROIRef = useRef<boolean>(false);
  const [ROI, setROI] = useState<[number, number, number, number] | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<number[]>([-1, -1]);
  const dragLengthRef = useRef<number[]>([-1, -1]);
  const dragIsSquaredRef = useRef<boolean>(false);
  const enableInputTensorRef = useRef<boolean>(false);
  const updateROIControlsRef = useRef<boolean>(true);

  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collections, setCollections] = useState([]);
  const [captureProgress, setCaptureProgress] = useState<number | null>(null);
  const flashOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef(null);

  const handleToggle = () => {
    setExpanded(!expanded);
  };
  
  const [renderer, setRenderer] = useState<RendererFunctions | null>(null);

  const selectRenderer = useCallback((postProcessor: string) => {
    switch (postProcessor) {
      case "pp_cls":
      case "pp_cls_softmax":
        setRenderer(() => drawClassificationOutput as RendererFunction<Classifications>);
        break;
      case "pp_od_bscn":
      case "pp_od_bcsn":
      case "pp_od_efficientdet_lite0":
      case "pp_od_yolo_ultralytics":
        setRenderer(() => drawObjectDetectionOutput as RendererFunction<Detections>);
        break;
      case "pp_posenet":
      case "pp_higherhrnet":
      case "pp_personlab":
      case "pp_yolo_pose_ultralytics":
        setRenderer(() => drawPoseEstimationOutput as RendererFunction<Poses>);
        break;
      case "pp_segment":
        setRenderer(() => drawSegmentationOutput as RendererFunction<Segments>);
        break;
      case "pp_yolo_segment_ultralytics":
        setRenderer(() => drawInstanceSegmentationOutput as RendererFunction<InstanceSegments>);
        break;
      case "pp_anomaly":
        setRenderer(() => drawAnomalyOutput as RendererFunction<Anomaly>);
        break;
      default:
        setRenderer(null);
    }
  }, []);

  useEffect(() => {
    sendRequest(
      {
        url: `${BACKEND_HOST}/api/custom-network/selected`,
      },
      (network: NetworkData) => {
        if (network) {
          if (network.labels) {
            setLabels(network.labels);
          } else {
            setLabels(null);
          }
          selectRenderer(network.model_post_processor);
        }
      },
      false
    );

    sendRequest(
      {
        url: `${BACKEND_HOST}/api/collection/list`,
      },
      (data: Collection[]) => {
        setCollections(data.map(item => item.collection_name));
      },
      false
    );
    
  }, [sendRequest, selectRenderer]);

  useEffect(() => {
    const handleFrame = async (frame: FrameData) => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");

        const { clientWidth, clientHeight } = document.documentElement;
        const currentWidth = document.fullscreenElement ? clientWidth : frame.width;
        const currentHeight = document.fullscreenElement ? clientHeight : frame.height;

        const maxSize = currentWidth > currentHeight ? currentWidth : currentHeight;
        const dstWidth = Math.round((currentWidth * 640) / maxSize);
        const dstHeight = Math.round((currentHeight * 640) / maxSize);

        setWidth(dstWidth);
        setHeight(dstHeight);
        fpsRef.current = parseFloat(frame.fps.toFixed(2));
        dpsRef.current = parseFloat(frame.dps.toFixed(2));

        // Renderer options
        const options: RendererOptions = { inputImage: true, labels: labels };
        if (renderer === drawObjectDetectionOutput) {
          options.threshold = thresholdRef.current;
        } else if (renderer === drawAnomalyOutput) {
          options.threshold = thresholdRef.current;
          options.pixel_threshold = pixelThresholdRef.current;
        } else if (renderer === drawPoseEstimationOutput) {
          options.threshold = thresholdRef.current;
          options.keypoint_score_threshold = keypointScoreThresholdRef.current;
        }

        // Update ROI if needed — parse {left, top, width, height} to [left, top, width, height]
        let roi: [number, number, number, number] | undefined;
        if (frame.roi) {
          const r = frame.roi;
          roi = [r.left, r.top, r.width, r.height];
        }
        if (enableInputTensorRef.current) { roi = [0, 0, 1, 1]; }
        setROI(roi ?? null);

        // Render
        if (renderer) {
          await renderer(ctx, frame.image, dstWidth, dstHeight, frame.detections, roi, options);
        } else {
          await drawInputImage(ctx, frame.image, dstWidth, dstHeight);
        }

        // Draw ROI
        if (showROIRef.current && roi) {
          const [left, top, width, height] = roi;
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'red';
          ctx.strokeRect(left * dstWidth, top * dstHeight, width * dstWidth, height * dstHeight);
        }

        // Draw dragging 
        if (isDraggingRef.current) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'white';
          ctx.strokeRect(dragStartRef.current[0], dragStartRef.current[1], dragLengthRef.current[0], dragLengthRef.current[1])
        }
      }
    };

    socket?.on("frame", handleFrame);

    return () => {
      socket?.off("frame", handleFrame);
    };
  }, [socket, renderer, labels]);

  const addMouseEvents = () => {
    document.addEventListener("mousedown", onMouseDown, false);
    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mouseup", onMouseUp, false);
  };

  const removeMouseEvents = () => {
    document.removeEventListener("mousedown", onMouseDown, false);
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
  };

  const onMouseDown = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;

    if (mouseX >= 0 && mouseY >= 0 && mouseX <= canvas.width && mouseY <= canvas.height) {
      isDraggingRef.current = true;
      dragStartRef.current = [mouseX, mouseY];
    }
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;

    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    let X = e.clientX - canvasRect.left;
    let Y = e.clientY - canvasRect.top;

    // Clip X and Y to the canvas boundaries
    X = Math.max(0, Math.min(X, canvas.width));
    Y = Math.max(0, Math.min(Y, canvas.height));

    const X0 = dragStartRef.current[0];
    const Y0 = dragStartRef.current[1];

    if (dragIsSquaredRef.current) {
      const dx = Math.abs(X - X0);
      const dy = Math.abs(Y - Y0);
      const size = Math.min(dx, dy);
      
      dragLengthRef.current = [
        ((X >= X0) ? size : -size),
        ((Y >= Y0) ? size : -size)
      ]
    } else {
      dragLengthRef.current = [X - X0, Y - Y0];
    }
  }

  const onMouseUp = () => {
    if (!isDraggingRef.current) return;    
    isDraggingRef.current = false;
    
    let left = dragStartRef.current[0] / canvasRef.current.width;
    let top = dragStartRef.current[1] / canvasRef.current.height;
    let width = dragLengthRef.current[0] / canvasRef.current.width;
    let height = dragLengthRef.current[1] / canvasRef.current.height;

    // Adjust left and top if width or height is negative
    if (width < 0) { left += width; width = Math.abs(width); }
    if (height < 0) { top += height; height = Math.abs(height); }

    // Check minimim widht and height, otherwise ignore the call
    if (width < 0.05 || height < 0.05) return;

    // Change ROI
    handleChangeROI([left, top, width, height])
    updateROIControlsRef.current = true;

    // Reset
    dragStartRef.current = [-1, -1];
    dragLengthRef.current = [-1, -1];
  }

  useEffect(() => {
    if (showROIRef.current && !document.fullscreenElement) {
      addMouseEvents();
    } else {
      removeMouseEvents();
    }
    return () => removeMouseEvents();
  }, [showROIRef.current, document.fullscreenElement]);


  const toggleFullScreen = () => {
    if (canvasRef.current) {
      if (!document.fullscreenElement) {
        canvasRef.current.requestFullscreen().catch((err) => {
          console.error("Error attempting to enable full-screen mode:", err.message);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  const triggerFlashEffect = () => {
    if (flashOverlayRef.current) {
      const flashOverlay = flashOverlayRef.current;
      flashOverlay.style.opacity = "1";
      flashOverlay.style.display = "block";

      let currentOpacity = 1;
      const duration = 500;
      const intervalTime = 20;
      const opacityStep = 1 / (duration / intervalTime);

      const animationInterval = setInterval(() => {
        currentOpacity -= opacityStep;
        flashOverlay.style.opacity = currentOpacity.toString();

        if (currentOpacity <= 0) {
          clearInterval(animationInterval);
          flashOverlay.style.display = "none";
        }
      }, intervalTime);
    }
  };

  const handleCapture = (hasTimer: boolean, captureRate: number, captureNbrOfPhotos: number) => {
    const collection_name = selectedCollection ? selectedCollection : initial_collection;

    if (hasTimer) {
      let photosCaptured = 0;
      setCaptureProgress(0);

      intervalRef.current = setInterval(() => {
        if (photosCaptured < captureNbrOfPhotos) {
          sendRequest(
            {
              url: `${BACKEND_HOST}/api/controls/capture?collection_name=${collection_name}`,
              method: 'POST'
            },
            () => {
              triggerFlashEffect();
              setCaptureProgress((prev) => (prev !== null ? prev + 1 : null));
            },
            false
          );
          photosCaptured++;
        } else {
          clearInterval(intervalRef.current);
          setCaptureProgress(null);
        }
      }, 1000 / captureRate);
    } else {
      sendRequest(
        {
          url: `${BACKEND_HOST}/api/controls/capture?collection_name=${collection_name}`,
          method: 'POST'
        },
        () => { triggerFlashEffect(); },
        false
      );
    }
  };

  const cancelCapture = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      setCaptureProgress(null);
    }
  }

  const handleChangeROI = async (roi: number[]) => {
    await sendRequest(
      {
        url: `${BACKEND_HOST}/api/controls/input_tensor_cropping`,
        method: "POST",
        data: roi,
      },
      () => {}
    );
  }

  const handleEnableInputTensor = async (value: boolean) => {
    enableInputTensorRef.current = value;
    await sendRequest(
      {
        url: `${BACKEND_HOST}/api/controls/enable_input_tensor?value=${value}`,
        method: "POST",
      },
      () => {}
    );
  }

  return (
    <>
      <Container
        ref={canvasContainerRef}
        sx={{
          display: "flex",
          flex: 1,
          width: "100%",
          height: height,
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        }}
      >
        <Box sx={{ position: "absolute", top: 10, right: { xs: -20, md: 0 } }}>
          <Typography>FPS: {fpsRef.current.toFixed(2)}</Typography>
        </Box>
        <Box sx={{ position: "absolute", top: 40, right: { xs: -20, md: 0 } }}>
          <Typography>DPS: {dpsRef.current.toFixed(2)}</Typography>
        </Box>
        <canvas ref={canvasRef} id="canvas" width={width} height={height}></canvas>
        <canvas ref={flashOverlayRef} id="flashCanvas" width={width} height={height}
          style={{ position: "absolute", backgroundColor: "white", opacity: 0, display: "none", pointerEvents: "none" }}
        ></canvas>
        <Box
          sx={{
            position: "absolute",
            bottom: 10,
            right: { md: canvasContainerRef.current ? (canvasContainerRef.current.offsetWidth - width) / 2 : 0, xs: -20 },
          }}
        >
          <Tooltip title="Full screen" placement="top">
            <IconButton onClick={toggleFullScreen}>
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Container>
      <Collapse in={expanded}>
        <CameraControls
          collection_name={selectedCollection ? selectedCollection : initial_collection}
          collections={collections}
          thresholdRef={thresholdRef}
          pixelThresholdRef={pixelThresholdRef}
          keypointScoreThresholdRef={keypointScoreThresholdRef}
          setSelectedCollection={setSelectedCollection}
          renderer={renderer}
          onCapture={handleCapture}
          captureProgress={captureProgress}
          onCancelCapture={cancelCapture}
          toggleShowROI={(value: boolean) => showROIRef.current = value}
          currentROI={ROI}
          handleChangeROI={handleChangeROI}
          toggleDragSquared={(value: boolean) => dragIsSquaredRef.current = value}
          enableInputTensor={enableInputTensorRef.current}
          toggleEnableInputTensor={handleEnableInputTensor}
          updateROIControlsRef={updateROIControlsRef}
        />
      </Collapse>
      <Divider sx={{ pb: 2 }}>
        <Button size="small" onClick={handleToggle} startIcon={expanded ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}>
          {expanded ? "Hide advanced" : "Show advanced"}
        </Button>
      </Divider>
    </>
  );
};

export default ImageDisplay;
