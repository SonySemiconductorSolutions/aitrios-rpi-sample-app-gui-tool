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
import { Container, Grid, Box, Button, Collapse, Divider, Typography, Input, IconButton, Tooltip, Slider } from "@mui/material";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import FullscreenIcon from "@mui/icons-material/Fullscreen";

import { drawClassificationOutput } from "../../utils/classification";
import { drawObjectDetectionOutput } from "../../utils/object-detection";
import { drawSegmentationOutput } from "../../utils/segmentation";
import { drawPoseEstimationOutput } from "../../utils/pose-estimation";
import useHttpNotifications from "../../hooks/use-http-notifications";
import { Socket } from "socket.io-client";
import { NetworkData } from "../../interfaces/CustomNetworkInterfaces";
import { Classifications, Detections, Segments, Poses, FrameData, RendererFunction, RendererOptions } from "../../interfaces/DetectionInterfaces";

interface ImageDisplayProps {
  socket: Socket;
}

const BACKEND_HOST = process.env.REACT_APP_BACKEND_HOST ? process.env.REACT_APP_BACKEND_HOST : "";


type RendererFunctions =
  | RendererFunction<Classifications>
  | RendererFunction<Detections>
  | RendererFunction<Segments>
  | RendererFunction<Poses>


const ImageDisplay = ({ socket }: ImageDisplayProps) => {
  const { sendRequest } = useHttpNotifications();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [labels, setLabels] = useState<string[] | null>(null);
  const [width, setWidth] = useState(640);
  const [height, setHeight] = useState(640);
  const [expanded, setExpanded] = useState(false);
  const [threshold, setThreshold] = useState(0.6);
  const [fps, setFps] = useState(0);

  const thresholdRef = useRef(threshold);

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
        setRenderer(() => drawObjectDetectionOutput as RendererFunction<Detections>);
        break;
      case "pp_segment":
        setRenderer(() => drawSegmentationOutput as RendererFunction<Segments>);
        break;
      case "pp_posenet":
        setRenderer(() => drawPoseEstimationOutput as RendererFunction<Poses>);
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
        if (network.labels) {
          setLabels(network.labels);
        } else {
          setLabels(null);
        }
        selectRenderer(network.model_post_processor);
      },
      false
    );
  }, [sendRequest, selectRenderer]);

  useEffect(() => {
    let lastTimestamp = performance.now();
    let frames = 0;

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

        // Renderer options
        const options: RendererOptions = { inputImage: true, labels: labels };
        if (renderer === drawObjectDetectionOutput) {
          options.threshold = thresholdRef.current;
        }

        await renderer(ctx, frame.image, dstWidth, dstHeight, frame.detections, options);

        frames++;
        const currentTimestamp = performance.now();
        const elapsedSeconds = (currentTimestamp - lastTimestamp) / 1000;

        if (elapsedSeconds >= 1) {
          setFps(Math.round(frames / elapsedSeconds));
          frames = 0;
          lastTimestamp = currentTimestamp;
        }
      }
    };

    socket?.on("frame", handleFrame);

    return () => {
      socket?.off("frame", handleFrame);
    };
  }, [socket, renderer, labels]);

  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

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
          <Typography>FPS: {fps}</Typography>
        </Box>
        <canvas ref={canvasRef} id="canvas" width={width} height={height}></canvas>
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
        <Container sx={{ display: "flex", justifyContent: "center", pt: 2, pb: 2, maxWidth: "640px" }}>
          <Grid container spacing={1}>
            {renderer === drawObjectDetectionOutput && (
              <>
                <Grid item xs={6}>
                  <Box>
                    <Typography fontWeight="bold" mb={2}>
                      Object Detection settings
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs>
                        <Slider
                          value={threshold}
                          min={0}
                          max={1}
                          step={0.01}
                          onChange={(event, newValue) => setThreshold(newValue as number)}
                        />
                      </Grid>
                      <Grid item>
                        <Input
                          value={threshold}
                          size="small"
                          onChange={(e) => setThreshold(Number(e.target.value))}
                          inputProps={{
                            min: 0,
                            max: 1,
                            step: 0.05,
                            type: "number",
                            "aria-labelledby": "input-slider",
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </>
            )}
          </Grid>
        </Container>
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
