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

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Socket, io } from "socket.io-client";
import JSZip from "jszip";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import PlayArrow from "@mui/icons-material/PlayArrow";
import Stop from "@mui/icons-material/Stop";
import Download from "@mui/icons-material/Download";

import { drawInputImage } from "../utils/input-image";
import { drawObjectDetectionOutput } from "../utils/object-detection";
import { drawPoseEstimationOutput } from "../utils/pose-estimation";
import { drawSegmentationOutput } from "../utils/segmentation";
import { drawInstanceSegmentationOutput } from "../utils/instance-segmentation";
import { drawAnomalyOutput } from "../utils/anomaly";

import PageLayout from "../components/layout/PageLayout";
import useHttpNotifications from "../hooks/use-http-notifications";
import {
  DataInjectionFrameData,
  RendererOptions,
  RendererFunction,
  Classifications,
  Detections,
  Poses,
  Segments,
  InstanceSegments,
  Anomaly,
} from "../interfaces/DetectionInterfaces";
import type { NetworkData } from "../interfaces/CustomNetworkInterfaces";
import { drawClassificationOutput } from "../utils/classification";

const BACKEND_HOST = import.meta.env.REACT_APP_BACKEND_HOST ?? "";

function getRendererOptions(
  labels: string[] | null,
  renderer: RendererFunctions | null
): RendererOptions {
  const options: RendererOptions = { inputImage: true, labels };
  if (renderer === drawObjectDetectionOutput) {
    options.threshold = 0.4;
  } else if (renderer === drawAnomalyOutput) {
    options.threshold = 0.3;
    options.pixel_threshold = 0.3;
  } else if (renderer === drawPoseEstimationOutput) {
    options.threshold = 0.15;
    options.keypoint_score_threshold = 0.1;
  }
  return options;
}

async function drawAnnotatedFrame(
  ctx: CanvasRenderingContext2D,
  frame: DataInjectionFrameData,
  dstWidth: number,
  dstHeight: number,
  renderer: RendererFunctions | null,
  options: RendererOptions
): Promise<void> {
  let roi: [number, number, number, number] | undefined;
  if (frame.roi) {
    const r = frame.roi;
    roi = [r.left, r.top, r.width, r.height];
  }
  if (renderer) {
    await renderer(
      ctx,
      frame.image,
      dstWidth,
      dstHeight,
      frame.detections,
      roi,
      options
    );
  } else {
    await drawInputImage(ctx, frame.image, dstWidth, dstHeight);
  }
}

export type RendererFunctions =
  | RendererFunction<Classifications>
  | RendererFunction<Detections>
  | RendererFunction<Poses>
  | RendererFunction<Segments>
  | RendererFunction<InstanceSegments>
  | RendererFunction<Anomaly>


const DataInjectionPage = () => {
  const [socket, setSocket] = useState<Socket>();
  const socketInitializedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { sendRequest } = useHttpNotifications();

  const [isStreaming, setIsStreaming] = useState(false);
  const [showDialog, setShowDialog] = useState<null | boolean>(false);
  const [models, setModels] = useState<string[]>([]);
  const [collections, setCollections] = useState<Array<{ collection_name: string; n_images: string }>>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [totalProgress, setTotalProgress] = useState<number>(0);
  const [latestFrame, setLatestFrame] = useState<DataInjectionFrameData | null>(null);
  const [frameHistory, setFrameHistory] = useState<DataInjectionFrameData[]>([]);
  const [inspectedFrameIndex, setInspectedFrameIndex] = useState<number | null>(null);
  const [selectedModelInfo, setSelectedModelInfo] = useState<NetworkData | null>(null);
  const [renderer, setRenderer] = useState<RendererFunctions | null>(null);
  const navigate = useNavigate();

  const displayFrame =
    inspectedFrameIndex != null && frameHistory[inspectedFrameIndex]
      ? frameHistory[inspectedFrameIndex]
      : latestFrame ?? (frameHistory.length > 0 ? frameHistory[frameHistory.length - 1] : null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const thumbnailCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const labels = selectedModelInfo?.labels ?? null;

  // Fetch models and collections on mount
  useEffect(() => {
    sendRequest(
      {
        url: `${BACKEND_HOST}/api/custom-network/list`,
      },
      (data: string[]) => {
        setModels(data);
      },
      false
    );

    sendRequest(
      {
        url: `${BACKEND_HOST}/api/collection/list`,
      },
      (data: Array<{ collection_name: string; n_images: string }>) => {
        setCollections(data);
      },
      false
    );
  }, [sendRequest]);

  // Reset frame history and progress when model or collection changes
  useEffect(() => {
    setFrameHistory([]);
    setLatestFrame(null);
    setInspectedFrameIndex(null);
    setCurrentProgress(0);
    setTotalProgress(0);
  }, [selectedModel, selectedCollection]);

  // Fetch selected model metadata (post_processor + labels) when selectedModel changes
  useEffect(() => {
    if (!selectedModel) {
      setSelectedModelInfo(null);
      setRenderer(null);
      setLatestFrame(null);
      return;
    }
    setLatestFrame(null);
    sendRequest(
      {
        url: `${BACKEND_HOST}/api/custom-network/list/${selectedModel}`,
      },
      (data: NetworkData) => {
        setSelectedModelInfo(data);
        const postProcessor = data.model_post_processor;
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
      },
      false,
      () => {
        setSelectedModelInfo(null);
        setRenderer(null);
      }
    );
  }, [selectedModel, sendRequest]);

  const startHandler = () => {
    if (!selectedModel || !selectedCollection) {
      setShowDialog(true);
      return;
    }

    if (socketInitializedRef.current) {
      return;
    }

    // Reset progress, frame history, and clear previous frame
    setCurrentProgress(0);
    setTotalProgress(0);
    setLatestFrame(null);
    setFrameHistory([]);
    setInspectedFrameIndex(null);
    // Clear display canvas immediately so no previous run's frame stays visible
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    const _socket = io(BACKEND_HOST, {
      transports: ["websocket"],
      reconnection: false,
    });

    _socket.on("connect", () => {
      console.log(`Data injection socket connected!`);
      
      // Construct collection path - client expects collection name
      // The client will construct: {MODLIB_HOME}/collections/{collection_name}
      const collectionPath = selectedCollection;

      _socket.emit(
        "control",
        {
          action: "data_injection",
          source: collectionPath,
          network: selectedModel,
        },
        () => {}
      );
      setIsStreaming(true);
    });

    _socket.on("connect_error", (error) => {
      console.error("Socket connection failed:", error);
      setShowDialog(true);
      socketInitializedRef.current = false;
    });

      _socket.on("disconnect", (reason) => {
        console.log(`Disconnected from server: ${reason}`);
        socketInitializedRef.current = false;
        setIsStreaming(false);
      });

    _socket.on("frame", (frameData: DataInjectionFrameData) => {
      setLatestFrame(frameData);
      setFrameHistory((prev) => [...prev, frameData]);

      // Update progress
      if (frameData.current !== undefined && frameData.total !== undefined) {
        setCurrentProgress(frameData.current);
        setTotalProgress(frameData.total);
        
        // Check if data injection is complete
        if (frameData.current >= frameData.total) {
          // Data injection completed
          setIsStreaming(false);
          // Optionally close socket after a short delay
          setTimeout(() => {
            if (_socket) {
              _socket.close();
              socketInitializedRef.current = false;
            }
          }, 1000);
        }
      }
    });

    setSocket(_socket);
    socketInitializedRef.current = true;
  };

  const stopHandler = () => {
    if (!socket?.connected) {
      return;
    }

    // Send stop action to client
    socket.emit(
      "control",
      {
        action: "stop",
      },
      () => {}
    );

    // Close socket connection
    socket.close();
    socketInitializedRef.current = false;
    setIsStreaming(false);
    setCurrentProgress(0);
    setTotalProgress(0);
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
        socketInitializedRef.current = false;
      }
    };
  }, [socket]);

  // Draw display frame on canvas when displayFrame, renderer, or labels change.
  // Use frame width/height (from backend) to scale while preserving aspect ratio;
  // scale so the longer side is 640px.
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!displayFrame) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const frameWidth = displayFrame.width;
    const frameHeight = displayFrame.height;
    const maxSize = Math.max(frameWidth, frameHeight);
    const dstWidth = Math.round((frameWidth * 640) / maxSize);
    const dstHeight = Math.round((frameHeight * 640) / maxSize);

    canvasRef.current.width = dstWidth;
    canvasRef.current.height = dstHeight;

    const options = getRendererOptions(labels, renderer);
    drawAnnotatedFrame(ctx, displayFrame, dstWidth, dstHeight, renderer, options);
  }, [displayFrame, renderer, labels]);

  // Draw annotated thumbnails when frameHistory, renderer, or labels change.
  const thumbMaxSize = 80;
  useEffect(() => {
    const options = getRendererOptions(labels, renderer);
    const drawAll = async () => {
      for (let i = 0; i < frameHistory.length; i++) {
        const canvas = thumbnailCanvasRefs.current[i];
        if (!canvas) continue;
        const frame = frameHistory[i];
        const maxSize = Math.max(frame.width, frame.height);
        const dstWidth = Math.round((frame.width * thumbMaxSize) / maxSize);
        const dstHeight = Math.round((frame.height * thumbMaxSize) / maxSize);
        canvas.width = dstWidth;
        canvas.height = dstHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await drawAnnotatedFrame(
            ctx,
            frame,
            dstWidth,
            dstHeight,
            null, // renderer
            options
          );
        }
      }
    };
    drawAll();
  }, [frameHistory, renderer, labels]);

  const handleDownloadAll = useCallback(async () => {
    if (frameHistory.length === 0) return;
    const options = getRendererOptions(labels, renderer);
    const zip = new JSZip();
    for (let i = 0; i < frameHistory.length; i++) {
      const frame = frameHistory[i];
      const maxSize = Math.max(frame.width, frame.height);
      const dstWidth = Math.round((frame.width * 640) / maxSize);
      const dstHeight = Math.round((frame.height * 640) / maxSize);
      const canvas = document.createElement("canvas");
      canvas.width = dstWidth;
      canvas.height = dstHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        await drawAnnotatedFrame(
          ctx,
          frame,
          dstWidth,
          dstHeight,
          renderer,
          options
        );
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/png");
        });
        if (blob) {
          zip.file(`frame_${String(i + 1).padStart(3, "0")}.png`, blob);
        }
      }
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `injected-frames-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [frameHistory, renderer, labels]);

  const highlightIndex =
    frameHistory.length > 0
      ? inspectedFrameIndex ?? frameHistory.length - 1
      : -1;

  // Imperative wheel listener with passive: false so preventDefault() actually blocks vertical page scroll
  useEffect(() => {
    const el = thumbnailStripRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [frameHistory.length]);

  return (
    <PageLayout>
      <Typography variant="h4" component="h1" gutterBottom>
        Data Injection
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel id="model-select-label">Model</InputLabel>
              <Select
                labelId="model-select-label"
                id="model-select"
                value={selectedModel}
                label="Model"
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isStreaming}
              >
                {models.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel id="collection-select-label">Collection</InputLabel>
              <Select
                labelId="collection-select-label"
                id="collection-select"
                value={selectedCollection}
                label="Collection"
                onChange={(e) => setSelectedCollection(e.target.value)}
                disabled={isStreaming}
              >
                {collections.map((collection) => (
                  <MenuItem key={collection.collection_name} value={collection.collection_name}>
                    {collection.collection_name} ({collection.n_images} images)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2} sx={{ display: "flex", justifyContent: "center" }}>
            <Tooltip title={isStreaming ? "Stop" : "Start data injection"}>
              <span>
                <IconButton
                  color={isStreaming ? "error" : "primary"}
                  onClick={isStreaming ? stopHandler : startHandler}
                  disabled={!selectedModel || !selectedCollection}
                  aria-label={isStreaming ? "Stop data injection" : "Start data injection"}
                  sx={{ bgcolor: isStreaming ? "error.light" : "primary.main", color: "white", "&:hover": { bgcolor: isStreaming ? "error.dark" : "primary.dark" }, "&.Mui-disabled": { color: "white", opacity: 0.7 } }}
                >
                  {isStreaming ? <Stop /> : <PlayArrow />}
                </IconButton>
              </span>
            </Tooltip>
          </Grid>
        </Grid>

        <Box sx={{ minHeight: 56, width: "100%" }}>
          {(isStreaming || totalProgress > 0) && (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                {totalProgress === 0 ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      Uploading Model...
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Data Injection Progress
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  {totalProgress > 0 ? `${currentProgress} / ${totalProgress}` : "0 / ?"}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={totalProgress > 0 ? (currentProgress / totalProgress) * 100 : 0}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </>
          )}
        </Box>

        <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <Box
            sx={{
              width: "100%",
              maxWidth: 640,
              height: 480,
              minHeight: 360,
              boxSizing: "border-box",
              p: 2,
              pb: 2.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              bgcolor: "action.hover",
              borderRadius: 1,
            }}
          >
          {displayFrame ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                width: "100%",
                height: "100%",
                minHeight: 0,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  opacity: 0.8,
                  flexShrink: 0,
                  mt: 0.5,
                }}
              >
                {`frame_${String(displayFrame.current).padStart(3, "0")}.jpg`}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
            </Typography>
          )}
          </Box>
        </Box>

        <Box sx={{ width: "100%", minHeight: 120 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              mb: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {frameHistory.length > 0 ? "Frames" : ""}
              </Typography>
              {inspectedFrameIndex != null && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setInspectedFrameIndex(null);
                    requestAnimationFrame(() => {
                      const el = thumbnailStripRef.current;
                      if (el) {
                        el.scrollLeft = el.scrollWidth;
                      }
                    });
                  }}
                  sx={{
                    color: "primary.main",
                    textTransform: "none",
                    minWidth: "auto",
                    minHeight: 0,
                    py: 0,
                    px: 0.5,
                    fontSize: "0.8125rem",
                    lineHeight: 1.25,
                  }}
                >
                  jump to latest frame
                </Button>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Tooltip title="Download all frames">
                <span>
                  <IconButton
                    size="small"
                    onClick={handleDownloadAll}
                    disabled={frameHistory.length === 0}
                    aria-label="Download all frames"
                  >
                    <Download />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
          <Box
            ref={thumbnailStripRef}
            sx={{
              display: "flex",
              gap: 1,
              overflowX: "auto",
              overflowY: "hidden",
              maxHeight: 100,
              minHeight: 84,
              py: 0.5,
              px: 0.5,
            }}
          >
            {frameHistory.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", px: 2 }}>
              </Typography>
            ) : (
              frameHistory.map((frame, i) => (
                <Box
                  key={i}
                  component="button"
                  type="button"
                  onClick={() => setInspectedFrameIndex(i)}
                  sx={{
                    flexShrink: 0,
                    height: 80,
                    width: "auto",
                    minWidth: 80,
                    border: 2,
                    borderColor:
                      i === highlightIndex ? "primary.main" : "divider",
                    borderRadius: 1,
                    overflow: "hidden",
                    p: 0,
                    cursor: "pointer",
                    bgcolor: "action.hover",
                    "&:hover": { bgcolor: "action.selected" },
                  }}
                >
                  <canvas
                    ref={(el) => {
                      thumbnailCanvasRefs.current[i] = el;
                    }}
                    style={{
                      height: "100%",
                      width: "auto",
                      maxWidth: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                    aria-label={`Frame ${i + 1}`}
                  />
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Box>

      <Dialog fullWidth open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogTitle variant="h5">Something went wrong</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {!selectedModel || !selectedCollection
              ? "Please select both a model and a collection before starting."
              : "Please try again!"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowDialog(false);
              navigate(-1);
            }}
          >
            Cancel
          </Button>
          <div style={{ flex: "1 0 0" }} />
          <Button
            color="error"
            onClick={() => {
              setShowDialog(false);
              if (selectedModel && selectedCollection) {
                startHandler();
              }
            }}
          >
            Try again
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default DataInjectionPage;
