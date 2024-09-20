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

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Socket, io } from "socket.io-client";
import {
  Container,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

import ImageDisplay from "./ImageDisplay";

const BACKEND_HOST = process.env.REACT_APP_BACKEND_HOST ? process.env.REACT_APP_BACKEND_HOST : "";

const CaptureImages = () => {
  const [socket, setSocket] = useState<Socket>();
  const socketInitializedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showDialog, setShowDialog] = useState<null | boolean>(false);
  const navigate = useNavigate();

  const startHandler = (_socket?: Socket) => {
    const currentSocket = _socket ? _socket : socket;

    if (!currentSocket?.connected) {
      setShowDialog(true);
      return;
    }

    currentSocket?.emit("control", { action: "start" }, () => {});
    setIsStreaming(true);
    setIsLoading(true);

    currentSocket?.once("frame", () => {
      setIsLoading(false);
    });
  };

  const stopHandler = (_socket?: Socket) => {
    const currentSocket = _socket ? _socket : socket;

    currentSocket?.emit("control", { action: "stop" }, () => {});
    currentSocket?.close();

    setIsStreaming(false);
    setIsLoading(false);
  };

  useEffect(() => {
    
    if (!socketInitializedRef.current) {
      const _socket = io(BACKEND_HOST, { transports: ["websocket"] });

      _socket.on("connect", () => {
        console.log(`Streaming socket connected!`);
        startHandler(_socket);
      });

      _socket.on("connect_error", (error) => {
        console.error("Socket connection failed:", error);
        setShowDialog(true);
      });

      _socket.on("disconnect", (reason) => {
        console.log(`Disconnected from server: ${reason}`);
      });

      setSocket(_socket);
      setIsLoading(true);
      socketInitializedRef.current = true;
    }

    return () => {
      if (socket) {
        stopHandler(socket);
      }
    };
  }, [socket]);

  return (
    <Container
      sx={{
        backgroundColor: "background.default",
        borderRadius: "15px",
        width: "100%",
        minHeight: "640px",
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Dialog fullWidth open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogTitle variant="h5">Something went wrong</DialogTitle>
        <DialogContent>
          <DialogContentText>Please try again!</DialogContentText>
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
              startHandler();
            }}
          >
            Try again
          </Button>
        </DialogActions>
      </Dialog>
      {isStreaming && <ImageDisplay socket={socket} />}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {isLoading && <CircularProgress size={100} />}
      </Box>
    </Container>
  );
};

export default CaptureImages;
