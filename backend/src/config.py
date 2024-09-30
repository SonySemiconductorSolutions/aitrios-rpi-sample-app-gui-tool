#
# Copyright 2024 Sony Semiconductor Solutions Corp. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import configparser
import os
import shutil
from typing import Dict, List, Optional

from fastapi import UploadFile


class GuitoolConfig:
    def __init__(self):
        self.model_dir = f"{os.getenv('UNIFY_HOME', os.path.expanduser('~/.unify'))}/models"
        os.makedirs(self.model_dir, exist_ok=True)

        self.config_file = os.path.join(self.model_dir, "models.cfg")
        self.config = configparser.ConfigParser()

        # Read current config file & create if not exist
        if os.path.exists(self.config_file):
            self.config.read(self.config_file)
        else:
            with open(self.config_file, "w") as configfile:
                self.config.write(configfile)

    def add_model(
        self,
        model_name: str,
        model_type: str,
        model_post_processor: str,
        model_color_format: str,
        model_preserve_aspect_ratio: bool,
        model: UploadFile,
        labels: Optional[UploadFile] = None,
    ):
        """Add a new model to the configuration file."""
        if self.config.has_section(model_name):
            raise ValueError(f"A model with the name '{model_name}' already exists.")

        save_dir = f"{self.model_dir}/{model_name}"
        os.makedirs(save_dir)

        model_file_path = os.path.join(save_dir, model.filename)
        with open(model_file_path, "wb") as file:
            file.write(model.file.read())

        self.config.add_section(model_name)
        self.config.set(model_name, "model_name", model_name)
        self.config.set(model_name, "model_type", model_type)
        self.config.set(model_name, "model_post_processor", model_post_processor)
        self.config.set(model_name, "model_color_format", model_color_format)
        self.config.set(model_name, "model_preserve_aspect_ratio", str(model_preserve_aspect_ratio).lower())
        self.config.set(model_name, "model_file", model_file_path)

        if labels:
            labels_file_path = os.path.join(save_dir, labels.filename)
            self.config.set(model_name, "labels_file", labels_file_path)
            with open(labels_file_path, "wb") as file:
                file.write(labels.file.read())

        with open(self.config_file, "w") as configfile:
            self.config.write(configfile)

    def delete_model(self, model_name: str):
        """Delete a model from the configuration file."""
        if not self.config.has_section(model_name):
            raise ValueError(f"No model with the name '{model_name}' exists.")

        shutil.rmtree(f"{self.model_dir}/{model_name}")

        self.config.remove_section(model_name)
        with open(self.config_file, "w") as configfile:
            self.config.write(configfile)

    def list_models(self) -> List[Dict[str, str]]:
        """List all available models."""
        models_list = []
        for section in self.config.sections():
            model_info = {**{key: self._convert_value(value) for key, value in self.config.items(section)}}
            models_list.append(model_info)
        return models_list

    def get_model_info(self, model_name: str):
        """Get model details"""
        if not self.config.has_section(model_name):
            raise ValueError(f"No model with the name '{model_name}' exists.")
        info = {**{key: self._convert_value(value) for key, value in self.config.items(model_name)}}

        # Add labels if labels_file present
        labels_file = info.get("labels_file")
        if labels_file and os.path.exists(labels_file):
            with open(labels_file, "r") as file:
                labels = file.read().splitlines()
            info["labels"] = labels

        return info

    def update_model(
        self,
        model_name: str,
        new_model_name: Optional[str] = None,
        model_type: Optional[str] = None,
        model_post_processor: Optional[str] = None,
        model_color_format: Optional[str] = None,
        model_preserve_aspect_ratio: Optional[bool] = False,
        model: Optional[UploadFile] = None,
        labels: Optional[UploadFile] = None,
    ):
        """Update existing model configuration values."""
        if not self.config.has_section(model_name):
            raise ValueError(f"No model with the name '{model_name}' exists.")

        if new_model_name and (new_model_name != model_name):
            if self.config.has_section(new_model_name):
                raise ValueError(f"A model with the name '{new_model_name}' already exists.")

            old_model_dir = os.path.join(self.model_dir, model_name)
            new_model_dir = os.path.join(self.model_dir, new_model_name)
            current_model_file = self.config.get(model_name, "model_file", fallback=None)
            current_labels_file = self.config.get(model_name, "labels_file", fallback=None)

            self.config.set(model_name, "model_name", new_model_name)
            try:
                if current_model_file:
                    self.config.set(
                        model_name,
                        "model_file",
                        current_model_file.replace(old_model_dir, new_model_dir),
                    )
            except:
                pass
            try:
                if current_labels_file:
                    self.config.set(
                        model_name,
                        "labels_file",
                        current_labels_file.replace(old_model_dir, new_model_dir),
                    )
            except:
                pass

            self.config[new_model_name] = self.config[model_name]
            self.config.remove_section(model_name)
            shutil.move(old_model_dir, new_model_dir)

            model_name = new_model_name

        # Update other model properties
        if model_type:
            self.config.set(model_name, "model_type", model_type)

        if model_post_processor:
            self.config.set(model_name, "model_post_processor", model_post_processor)

        if model_color_format:
            self.config.set(model_name, "model_color_format", model_color_format)

        if model_preserve_aspect_ratio is not None:
            self.config.set(model_name, "model_preserve_aspect_ratio", str(model_preserve_aspect_ratio).lower())

        # Update the model file if provided
        if model:
            current_model_file = self.config.get(model_name, "model_file", fallback=None)
            if current_model_file and os.path.isfile(current_model_file):
                os.remove(current_model_file)

            model_file_path = os.path.join(self.model_dir, model_name, model.filename)
            self.config.set(model_name, "model_file", model_file_path)

            with open(model_file_path, "wb") as file:
                file.write(model.file.read())

        # Update the labels file if provided, even if it doesn't already exist
        if labels:
            current_labels_file = self.config.get(model_name, "labels_file", fallback=None)
            if current_labels_file and os.path.isfile(current_labels_file):
                os.remove(current_labels_file)

            labels_file_path = os.path.join(self.model_dir, model_name, labels.filename)
            self.config.set(model_name, "labels_file", labels_file_path)

            with open(labels_file_path, "wb") as file:
                file.write(labels.file.read())

        # Save updated configuration to file
        with open(self.config_file, "w") as configfile:
            self.config.write(configfile)

    def _convert_value(self, value: str) -> any:
        """Convert configuration value to its appropriate type."""
        if value.lower() in ("true", "false"):
            return value.lower() == "true"
        return value
