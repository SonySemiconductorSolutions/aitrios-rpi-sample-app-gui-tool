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

import { useEffect } from "react";
import { Alert, AlertColor } from "@mui/material";

interface NotificationProps {
  id: string;
  type: AlertColor;
  message: string;
  onRemove: (id: string) => void;
}

const Notification = ({ id, type, message, onRemove }: NotificationProps) => {
  useEffect(() => {
    const timer = setTimeout(async () => {
      onRemove(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const closeHandler = () => {
    onRemove(id);
  };
  return (
    <Alert sx={{ mb: 1 }} variant="filled" severity={type} onClose={closeHandler}>
      {message}
    </Alert>
  );
};

export default Notification;
