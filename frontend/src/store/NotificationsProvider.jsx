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

import React, { useCallback, useReducer } from "react";

import NotificationsContext from "./NotificationsContext";

const defaultNotifications = {
  notifications: [],
};

let uniqueId = 0;

const notificationsReducer = (state, action) => {
  if (action.type === "SAVE") {
    uniqueId += 1;
    return {
      notifications: state.notifications.concat({
        ...action.notification,
        id: uniqueId,
      }),
    };
  }

  if (action.type === "REMOVE") {
    return {
      notifications: state.notifications.filter((notification) => notification.id !== action.id),
    };
  }

  if (action.type === "CLEAR") {
    return {
      notifications: [],
    };
  }

  return defaultNotifications;
};

const NotificationsProvider = (props) => {
  const [notificationsState, dispatchNotificationsAction] = useReducer(notificationsReducer, defaultNotifications);

  const showSuccessHandler = useCallback((message) => {
    dispatchNotificationsAction({
      type: "SAVE",
      notification: { type: "success", message: message },
    });
  }, []);

  const showWarningHandler = useCallback((message) => {
    dispatchNotificationsAction({
      type: "SAVE",
      notification: { type: "warning", message: message },
    });
  }, []);

  const showErrorHandler = useCallback((message) => {
    dispatchNotificationsAction({
      type: "SAVE",
      notification: { type: "error", message: message },
    });
  }, []);

  const removeNotificationsHandler = useCallback((id) => {
    dispatchNotificationsAction({
      type: "REMOVE",
      id: id,
    });
  }, []);

  const clearNotificationsHandler = useCallback(() => {
    dispatchNotificationsAction({
      type: "CLEAR",
    });
  }, []);

  const notificationsContext = {
    notifications: notificationsState.notifications,
    success: showSuccessHandler,
    warning: showWarningHandler,
    error: showErrorHandler,
    remove: removeNotificationsHandler,
    clear: clearNotificationsHandler,
  };

  return <NotificationsContext.Provider value={notificationsContext}>{props.children}</NotificationsContext.Provider>;
};

export default NotificationsProvider;
