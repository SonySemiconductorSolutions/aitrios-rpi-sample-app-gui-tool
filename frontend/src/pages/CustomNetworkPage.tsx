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

import { useState, useEffect } from "react";

import PageLayout from "../components/layout/PageLayout";
import useHttpNotifications from "../hooks/use-http-notifications";
import { NetworkData, EditNetworkData } from "../interfaces/CustomNetworkInterfaces";
import CustomNetwork from "../components/custom-network/CustomNetwork";
import EditCustomNetwork from "../components/custom-network/EditCustomNetwork";

const BACKEND_HOST = process.env.REACT_APP_BACKEND_HOST ? process.env.REACT_APP_BACKEND_HOST : "";

const CustomNetworkPage = () => {
  const [networks, setNetworks] = useState([]);
  const { sendRequest } = useHttpNotifications();

  const defaultNetworkData: NetworkData = {
    model_name: "",
    model_type: "",
    model_post_processor: "",
    model_color_format: "",
    model_preserve_aspect_ratio: false,
    model_file: "",
  };

  const initialState = {
    loading: false,
    openedDialog: false,
    selectedNetwork: defaultNetworkData,
    editNetwork: defaultNetworkData,
  };

  const [{ loading, openedDialog, selectedNetwork, editNetwork }, setState] = useState(initialState);

  const openAddDialog = () => {
    setState((prevState) => ({ ...prevState, editNetwork: defaultNetworkData, openedDialog: true }));
  };

  const openEditDialog = (network: string) => {
    if (selectedNetwork.model_name !== network) {
      setState((prevState) => ({ ...prevState, loading: true }));
      sendRequest(
        {
          url: `${BACKEND_HOST}/api/custom-network/list/${network}`,
        },
        (data: NetworkData) => {
          setState((prevState) => ({
            ...prevState,
            openedDialog: true,
            editNetwork: data,
            loading: false,
          }));
        },
        false
      );
    } else {
      setState((prevState) => ({ ...prevState, editNetwork: selectedNetwork, openedDialog: true }));
    }
  };

  useEffect(() => {
    setState((prevState) => ({ ...prevState, loading: true }));
    sendRequest(
      {
        url: `${BACKEND_HOST}/api/custom-network/list`,
      },
      (data: string[]) => {
        setNetworks(data);
      },
      false
    );

    sendRequest(
      {
        url: `${BACKEND_HOST}/api/custom-network/selected`,
      },
      (network: NetworkData | null) => {
        if (network !== null) {
          setState((prevState) => ({
            ...prevState,
            selectedNetwork: network,
            loading: false,
          }));
        } else {
          setState((prevState) => ({ ...prevState, loading: false }));
        }
      }
    );
  }, [sendRequest]);

  const selectNetwork = async (network: string) => {
    await sendRequest(
      {
        url: `${BACKEND_HOST}/api/custom-network/selected?network=${network}`,
        method: "POST",
      },
      () => {}
    );

    await sendRequest(
      {
        url: `http://localhost:3001/api/custom-network/list/${network}`,
      },
      (data: NetworkData) => {
        setState((prevState) => ({
          ...prevState,
          selectedNetwork: data,
        }));
      },
      false
    );
  };

  const deleteNetwork = async (network: string) => {
    await sendRequest(
      {
        url: `${BACKEND_HOST}/api/custom-network/list/${network}`,
        method: "DELETE",
      },
      () => {
        setNetworks((prevNetworks) => prevNetworks.filter((n) => n !== network));
      }
    );
  };

  const downloadNetwork = async (network: string) => {
    try {
      const response = await fetch(`${BACKEND_HOST}/api/custom-network/download/${network}`);
      const blob = await response.blob();

      const anchorElement = document.createElement("a");
      anchorElement.href = URL.createObjectURL(blob);
      anchorElement.download = `${network}.zip`;
      anchorElement.click();

      URL.revokeObjectURL(anchorElement.href);
      anchorElement.remove();
    } catch (error) {
      console.error(error);
    }
  };

  const setNetworkState = async () => {
    await sendRequest(
      {
        url: `${BACKEND_HOST}/api/custom-network/selected`,
      },
      (network: NetworkData | null) => {
        if (network !== null) {
          setState((prevState) => ({
            ...prevState,
            selectedNetwork: network,
            openedDialog: false,
          }));
        } else {
          setState(initialState);
        }
      }
    );
  };

  const createCustomNetwork = async (data: EditNetworkData) => {
    const formData = new FormData();
    formData.append("network_name", data.network.model_name);
    formData.append("network_type", data.network.model_type);
    formData.append("post_processor", data.network.model_post_processor);
    formData.append("color_format", data.network.model_color_format);
    formData.append("preserve_aspect_ratio", data.network.model_preserve_aspect_ratio.toString());
    formData.append("network", data.networkFile);
    if (data.labelsFile) {
      formData.append("labels", data.labelsFile);
    }

    await sendRequest(
      {
        url: `${BACKEND_HOST}/api/custom-network/list`,
        method: "POST",
        data: formData,
      },
      () => {
        setNetworkState();
        setNetworks((prevNetworks) => prevNetworks.concat(data.network_name));
      }
    );
  };

  const updateCustomNetwork = async (data: EditNetworkData) => {
    const formData = new FormData();
    formData.append("new_network_name", data.network.model_name);
    formData.append("network_type", data.network.model_type);
    formData.append("post_processor", data.network.model_post_processor);
    formData.append("color_format", data.network.model_color_format);
    formData.append("preserve_aspect_ratio", data.network.model_preserve_aspect_ratio.toString());
    if (data.networkFile) {
      formData.append("network", data.networkFile);
    }
    if (data.labelsFile) {
      formData.append("labels", data.labelsFile);
    }

    await sendRequest(
      {
        url: `${BACKEND_HOST}/api/custom-network/list/${data.network_name}`,
        method: "PUT",
        data: formData,
      },
      () => {
        setState((prevState) => ({ ...prevState, openedDialog: false }));
        setNetworks((prevNetworks) => prevNetworks.map((n) => (n === data.network_name ? data.network.model_name : n)));
        if (selectedNetwork.model_name == data.network_name) {
          setNetworkState();
        }
      }
    );
  };

  const downloadZoo = async () => {
    setState((prevState) => ({ ...prevState, loading: true }));
    await sendRequest(
      {
        url: `${BACKEND_HOST}/api/custom-network/download`,
        method: "POST",
      },
      () => {}
    );

    sendRequest(
      {
        url: `${BACKEND_HOST}/api/custom-network/list`,
      },
      (data: string[]) => {
        setNetworks(data);
        setState((prevState) => ({
          ...prevState,
          loading: false,
        }));
      },
      false
    );
  };

  return (
    <>
      <PageLayout>
        <EditCustomNetwork
          open={openedDialog}
          selectedNetwork={editNetwork}
          onClose={setNetworkState}
          onAdd={createCustomNetwork}
          onSave={updateCustomNetwork}
          onDelete={deleteNetwork}
        />
        <CustomNetwork
          loading={loading}
          networks={networks}
          selectedNetwork={selectedNetwork}
          selectNetwork={selectNetwork}
          onDeleteCustomNetwork={deleteNetwork}
          onDownloadCustomNetwork={downloadNetwork}
          onAddCustomNetwork={openAddDialog}
          onEditCustomNetwork={openEditDialog}
          onDownloadZoo={downloadZoo}
        />
      </PageLayout>
    </>
  );
};

export default CustomNetworkPage;
