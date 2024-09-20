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

import { useCallback, useContext } from "react";

import useHttp from "./use-http";

import NotificationsContext from "../store/NotificationsContext";

const useHttpNotifications = () => {
  const { isLoading, sendRequest: sendRequestHttp } = useHttp();
  const notificationsCtx = useContext(NotificationsContext);

  const errorNotification = notificationsCtx.error;
  const successNotification = notificationsCtx.success;

  const sendRequest = useCallback(
    async (requestConfig, dataHandler, show = true, errorHandler) => {
      const showErrorNotification = (error) => {
        if (errorHandler) {
          errorHandler(error);
        } else {
          if (error.response) {
            errorNotification(`[Error ${error.response.status}] ${error.response.data.message}`);
          } else if (error.request) {
            errorNotification(`No response from ${requestConfig.url}`);
          } else {
            errorNotification(error.message);
          }
        }
      };

      const showSuccessNotification = (data) => {
        if (show) {
          successNotification("Request sent successfully");
        }
        dataHandler(data);
      };

      await sendRequestHttp(requestConfig, showSuccessNotification, showErrorNotification);
    },
    [errorNotification, successNotification, sendRequestHttp]
  );

  return {
    isLoading,
    sendRequest,
  };
};

export default useHttpNotifications;
