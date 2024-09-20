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

from unify.models import Model
from unify.models.post_processors import (
    pp_cls,
    pp_cls_softmax,
    pp_od_bcsn,
    pp_od_bscn,
    pp_od_efficientdet_lite0,
    pp_posenet,
    pp_segment,
)


@dataclass
class PostProcessors:
    pp_cls = pp_cls
    pp_cls_softmax = pp_cls_softmax
    pp_od_bcsn = pp_od_bcsn
    pp_od_bscn = pp_od_bscn
    pp_od_efficientdet_lite0 = pp_od_efficientdet_lite0
    pp_posenet = pp_posenet
    pp_segment = pp_segment


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
