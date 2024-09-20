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

export interface NetworkData {
  model_name: string;
  model_type: string;
  model_post_processor: string;
  model_color_format: string;
  model_preserve_aspect_ratio: boolean;
  model_file: string;
  labels_file?: string;
  labels?: string[];
}

export interface EditNetworkData {
  network_name: string;
  network: NetworkData;
  networkFile: File | null;
  labelsFile: File | null;
}

export interface CustomNetworkProps {
  loading: boolean;
  networks: string[];
  selectedNetwork: NetworkData;
  selectNetwork: (network: string) => void;
  onDeleteCustomNetwork: (network: string) => Promise<void>;
  onDownloadCustomNetwork: (network: string) => Promise<void>;
  onAddCustomNetwork: () => void;
  onEditCustomNetwork: (network: string) => void;
  onDownloadZoo: () => void;
}

export interface EditCustomNetworkProps {
  open: boolean;
  selectedNetwork: NetworkData;
  onClose: () => void;
  onAdd: (data: EditNetworkData) => void;
  onSave: (data: EditNetworkData) => void;
  onDelete: (network: string) => Promise<void>;
}
