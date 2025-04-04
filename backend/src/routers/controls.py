import base64
import logging
import os
import time
import uuid
from typing import Tuple

from fastapi import APIRouter, HTTPException
from src import CONNECTED_CLIENTS
from src.sio import sio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

control_router = APIRouter(prefix="/api/controls")


@control_router.post("/capture")
async def capture_image(collection_name: str):
    TARGET_CLIENT_ID = "id-camera"
    try:
        collection_dir = f"{os.getenv('MODLIB_HOME', os.path.expanduser('~/.modlib'))}/collections"
        collection_path = os.path.join(collection_dir, collection_name)
        if not os.path.exists(collection_path) or not os.path.isdir(collection_path):
            raise HTTPException(
                status_code=404, detail=f"Collection '{collection_name}' not found or is not a directory."
            )

        if TARGET_CLIENT_ID not in CONNECTED_CLIENTS:
            raise HTTPException(status_code=404, detail=f"Client '{TARGET_CLIENT_ID}' not found.")

        target_sid = CONNECTED_CLIENTS[TARGET_CLIENT_ID]

        response = await sio.call(
            "control",
            {"action": "capture", "sid": target_sid},
            to=target_sid,
            timeout=5,
        )

        image_data = response.get("image")
        if not image_data:
            raise HTTPException(status_code=500, detail="No image data received.")

        # Save image in the collection
        image_path = os.path.join(collection_path, f"{int(time.time())}-{uuid.uuid4()}.jpeg")
        image_binary = base64.b64decode(image_data.split(",")[1])
        with open(image_path, "wb") as image_file:
            image_file.write(image_binary)

        return {"message": "Image captured and saved successfully.", "image_path": image_path}

    except Exception as e:
        logger.error(f"Error capturing image: {e}, Make sure the device is running to capture images!")
        raise HTTPException(status_code=500, detail=str(e))


@control_router.post("/input_tensor_cropping", response_model=dict)
async def set_input_tensor_cropping(roi_relative: Tuple[float, float, float, float]):
    """
    Set the input tensor cropping for the device.

    Args:
        roi_relative (Tuple[float, float, float, float]): The relative ROI (region of interest) values.
            - left: The left position of the ROI as a percentage of the total width (0 to 1).
            - top: The top position of the ROI as a percentage of the total height (0 to 1).
            - width: The width of the ROI as a percentage of the total width (0 to 1).
            - height: The height of the ROI as a percentage of the total height (0 to 1).

    Raises:
        ValueError: If any of the ROI values are not between 0 and 1 or if the ROI exceeds the frame dimensions.
    """
    TARGET_CLIENT_ID = "id-camera"
    try:
        if TARGET_CLIENT_ID not in CONNECTED_CLIENTS:
            raise HTTPException(status_code=404, detail=f"Client '{TARGET_CLIENT_ID}' not found.")
        target_sid = CONNECTED_CLIENTS[TARGET_CLIENT_ID]

        if not all(0 <= value <= 1 for value in roi_relative):
            raise ValueError("All relative ROI values (left, top, width, height) must be between 0 and 1.")

        (left, top, width, height) = roi_relative
        if left + width > 1 or top + height > 1:
            raise ValueError("ROI is out of the frame. Ensure that left + width <= 1 and top + height <= 1.")

        r = await sio.call(
            "control",
            {
                "action": "input_tensor_cropping",
                "roi_relative": roi_relative,
                "sid": target_sid,
            },
            to=target_sid,
            timeout=5,
        )

        return {"message": r}

    except Exception as e:
        logger.error(f"Error setting input tensor cropping: {e}, Make sure the device is running")
        raise HTTPException(status_code=500, detail=str(e))


@control_router.post("/enable_input_tensor", response_model=dict)
async def set_enable_input_tensor(value: bool):
    TARGET_CLIENT_ID = "id-camera"
    try:
        if TARGET_CLIENT_ID not in CONNECTED_CLIENTS:
            raise HTTPException(status_code=404, detail=f"Client '{TARGET_CLIENT_ID}' not found.")
        target_sid = CONNECTED_CLIENTS[TARGET_CLIENT_ID]

        if not isinstance(value, bool):
            raise ValueError("The 'value' parameter must be a boolean.")

        r = await sio.call(
            "control",
            {
                "action": "enable_input_tensor",
                "value": value,
                "sid": target_sid,
            },
            to=target_sid,
            timeout=5,
        )

        return {"message": r}

    except Exception as e:
        logger.error(f"Error enabling input tensor: {e}, Make sure the device is running")
        raise HTTPException(status_code=500, detail=str(e))
