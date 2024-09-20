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

import { useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import Notification from "./Notification";

import NotificationsContext from "../../store/NotificationsContext";

const NotificationsList = () => {
  const location = useLocation();
  const notificationsCtx = useContext(NotificationsContext);

  useEffect(() => {
    notificationsCtx.clear();
  }, [location.pathname]);

  const removeHandler = (id: string) => {
    notificationsCtx.remove(id);
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", flex: 1 }}>
      <Box sx={{ position: "fixed", zIndex: 1000, mt: 4 }}>
        {notificationsCtx.notifications?.map((notification) => (
          <Notification
            key={notification.id}
            id={notification.id}
            type={notification.type}
            message={notification.message}
            onRemove={removeHandler}
          />
        ))}
      </Box>
    </Box>
  );
};

export default NotificationsList;
