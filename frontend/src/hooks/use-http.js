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

import { useState, useCallback } from "react";

import axios from "axios";

const useHttp = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendRequest = useCallback(async (requestConfig, dataHandler, errorHandler) => {
    setIsLoading(true);
    try {
      const response = await axios({
        url: requestConfig.url,
        method: requestConfig.method ? requestConfig.method : "GET",
        params: requestConfig.params ? requestConfig.params : {},
        data: requestConfig.data ? requestConfig.data : null,
      });

      dataHandler(response.data);
    } catch (error) {
      errorHandler(error);
    }
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    sendRequest,
  };
};

export default useHttp;
