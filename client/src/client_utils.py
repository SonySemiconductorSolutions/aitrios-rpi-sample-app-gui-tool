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

from dataclasses import dataclass

import os
import cv2
import base64
import configparser
from modlib.devices import AiCamera
from modlib.devices.sources import Images
from modlib.devices.imx500 import isp
from modlib.models import Model
from modlib.models.post_processors import (
    pp_cls,
    pp_cls_softmax,
    pp_od_bcsn,
    pp_od_bscn,
    pp_od_efficientdet_lite0,
    pp_posenet,
    pp_higherhrnet,
    pp_segment,
    pp_anomaly,
    pp_personlab,
    pp_od_yolo_ultralytics,
    pp_yolo_pose_ultralytics,
    pp_yolo_segment_ultralytics,
)


@dataclass
class PostProcessors:
    pp_cls = pp_cls
    pp_cls_softmax = pp_cls_softmax
    pp_od_bcsn = pp_od_bcsn
    pp_od_bscn = pp_od_bscn
    pp_od_efficientdet_lite0 = pp_od_efficientdet_lite0
    pp_posenet = pp_posenet
    pp_higherhrnet = pp_higherhrnet
    pp_segment = pp_segment
    pp_anomaly = pp_anomaly
    pp_personlab = pp_personlab
    pp_od_yolo_ultralytics = pp_od_yolo_ultralytics
    pp_yolo_pose_ultralytics = pp_yolo_pose_ultralytics
    pp_yolo_segment_ultralytics = pp_yolo_segment_ultralytics


class CustomModel(Model):
    def __init__(self, info):
        # Get unified post processor function
        if hasattr(PostProcessors, info["model_post_processor"]):
            self.pp_func = getattr(PostProcessors, info["model_post_processor"])
        else:
            raise ValueError("Unknown post processor function")

        if info["model_preserve_aspect_ratio"].lower() not in ("true", "false"):
            raise ValueError("Preserve aspect ratio should be either 'true' or 'false'.")

        super().__init__(
            model_file=info["model_file"],
            model_type=info["model_type"].lower(),
            color_format=info["model_color_format"],
            preserve_aspect_ratio=info["model_preserve_aspect_ratio"].lower() == "true",
        )

    def post_process(self, output_tensors):
        return self.pp_func(output_tensors)


def get_modlib_model(model_name: str):
    model_config = configparser.ConfigParser()
    model_config.read(f"{os.getenv('MODLIB_HOME', os.path.expanduser('~/.modlib'))}/models/models.cfg")

    if model_config.has_section(model_name):
        return CustomModel(model_config[model_name])
    else:
        return None


def run_modlib(queue, cmd_queue, capture_response_queue, selected_model, enable_input_tensor):
    """
    Top-level worker for the streaming process.
    """
    device = AiCamera(headless=True, enable_input_tensor=enable_input_tensor)
    model = get_modlib_model(selected_model)
    if model:
        device.deploy(model, overwrite=False)

    with device as stream:
        for frame in stream:
            # Process command queue
            if not cmd_queue.empty():
                msg = cmd_queue.get()
                if msg.get("action") == "capture":
                    ret, buffer = cv2.imencode(
                        ".jpg",
                        (cv2.cvtColor(frame.image, cv2.COLOR_RGB2BGR) if frame.color_format == "RGB" else frame.image),
                    )
                    capture_response_queue.put(
                        {"image": f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"}
                    )
                elif msg.get("action") == "input_tensor_cropping":
                    device.set_input_tensor_cropping(tuple(msg.get("roi_relative")))
                elif msg.get("action") == "shutdown":
                    break
                else:
                    raise ValueError("Unknown control event.")

            ret, buffer = cv2.imencode(
                ".jpg",
                cv2.cvtColor(frame.image, cv2.COLOR_RGB2BGR) if frame.color_format == "RGB" else frame.image,
            )

            frame_data = {
                "image": f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}",
                "detections": frame.detections.json() if model else None,
                "width": frame.width,
                "height": frame.height,
                "roi": frame.roi.json(),
                "fps": frame.fps,
                "dps": frame.dps,
            }

            queue.put(frame_data)


def run_modlib_data_injection(queue, cmd_queue, capture_response_queue, selected_model, data_injection_source):
    device = AiCamera(headless=True, data_injection=True, enable_input_tensor=False, frame_rate=5)
    model = get_modlib_model(selected_model)
    if model:
        device.deploy(model, overwrite=False)

    source = Images(data_injection_source)
    total_images = len(source)

    with device:
        for i, img in enumerate(source):
            # Allow process interruption
            if not cmd_queue.empty():
                msg = cmd_queue.get()
                if msg.get("action") == "shutdown":
                    break
                else:
                    raise ValueError("Unknown control event.")

            # 1. Prepare input tensor (like IMX500 ISP)
            dsp_input_tensor, roi = isp.prepare_tensor_like_isp(
                img=img, model=model, src_color_format=source.color_format
            )

            # 2. Inject input tensor
            detections = device.inject(dsp_input_tensor)

            # 3. Visualize result with a Frame
            # OpenCV/numpy shape is (height, width, channels)
            height, width, _ = img.shape
            ret, buffer = cv2.imencode(
                ".jpg",
                cv2.cvtColor(img, cv2.COLOR_RGB2BGR) if source.color_format == "RGB" else img,
            )

            frame_data = {
                "image": f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}",
                "detections": detections.json() if model else None,
                "width": width,
                "height": height,
                "roi": roi.json(),
                "current": i + 1,  # 1-indexed for display
                "total": total_images,
            }

            queue.put(frame_data)
