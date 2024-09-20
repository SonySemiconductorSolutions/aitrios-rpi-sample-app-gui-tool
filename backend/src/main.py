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

import logging
import os
import shutil
import sys
import tempfile
from io import BytesIO

import git
import socketio
import uvicorn
from config import GuitoolConfig
from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def resource_path(relative_path):
    """Get absolute path to resource, works for dev and for PyInstaller"""
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)


ui_folder = resource_path("ui")
app.mount("/ui", StaticFiles(directory=ui_folder, html=True), name="ui")

cn_router = APIRouter(prefix="/api/custom-network")

guitool = GuitoolConfig()
connected_clients = {}

###############

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    for client_id, client_sid in connected_clients.items():
        if client_sid == sid:
            del connected_clients[client_id]
            break


@sio.event
async def register(sid, data):
    client_id = data.get("client_id")
    if client_id:
        connected_clients[client_id] = sid
        logger.info(f"Registered client {client_id} with sid {sid}")


@sio.event
async def message(sid, data):
    logger.info(f"Message from {sid}: {data}")
    await sio.emit("broadcast_message", {"data": data}, skip_sid=sid)


@sio.event
async def control(sid, data):
    logger.info(f"control event received from {sid} with data: {data}")
    await sio.emit("control", data, skip_sid=sid)


@sio.event
async def frame(sid, data):
    await sio.emit("frame", data, skip_sid=sid)


socket_app = socketio.ASGIApp(sio, app)


#################


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/ui")


@cn_router.get("/list")
async def list_models():
    try:
        return guitool.config.sections()
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@cn_router.post("/list")
async def add_model(
    network_name: str = Form(...),
    network_type: str = Form(...),
    post_processor: str = Form(...),
    color_format: str = Form(...),
    preserve_aspect_ratio: bool = Form(...),
    network: UploadFile = File(...),
    labels: UploadFile = File(None),
):
    try:
        guitool.add_model(
            model_name=network_name,
            model_type=network_type,
            model_post_processor=post_processor,
            model_color_format=color_format,
            model_preserve_aspect_ratio=preserve_aspect_ratio,
            model=network,
            labels=labels,
        )
        return {"message": "Model uploaded successfully"}
    except Exception as e:
        logger.error(f"Error adding model '{network_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@cn_router.get("/list/{network_name}")
async def get_model_info(network_name: str):
    try:
        return guitool.get_model_info(network_name)
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@cn_router.put("/list/{network_name}")
async def update_model(
    network_name: str,
    new_network_name: str = Form(None),
    network_type: str = Form(None),
    post_processor: str = Form(None),
    color_format: str = Form(None),
    preserve_aspect_ratio: bool = Form(None),
    network: UploadFile = File(None),
    labels: UploadFile = File(None),
):
    try:
        guitool.update_model(
            model_name=network_name,
            new_model_name=new_network_name,
            model_type=network_type,
            model_post_processor=post_processor,
            model_color_format=color_format,
            model_preserve_aspect_ratio=preserve_aspect_ratio,
            model=network,
            labels=labels,
        )
        return {"message": f"Model '{network_name}' updated successfully"}
    except Exception as e:
        logger.error(f"Error updating model '{network_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@cn_router.delete("/list/{network_name}")
async def delete_model(network_name: str):
    try:
        # BUG: if the deleted model is the currently selected one: set selected to None
        # NOTE: waiting for model management on device to easily access the device client
        guitool.delete_model(network_name)
        return {"message": f"Model '{network_name}' deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting model '{network_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@cn_router.get("/selected")
async def get_selected_model():
    TARGET_CLIENT_ID = "id-camera"
    try:
        if TARGET_CLIENT_ID not in connected_clients:
            raise HTTPException(status_code=404, detail=f"Client '{TARGET_CLIENT_ID}' not found.")

        target_sid = connected_clients[TARGET_CLIENT_ID]

        response = await sio.call(
            "control",
            {"action": "get_selected", "sid": target_sid},
            to=target_sid,
            timeout=5,
        )
        if response["selected_model"] is not None:
            return guitool.get_model_info(response["selected_model"])
        else:
            return None
    except Exception as e:
        logger.error(f"Error getting selected model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@cn_router.post("/selected")
async def select_model(network: str):
    TARGET_CLIENT_ID = "id-camera"
    try:
        if TARGET_CLIENT_ID not in connected_clients:
            raise HTTPException(status_code=404, detail=f"Client '{TARGET_CLIENT_ID}' not found.")

        target_sid = connected_clients[TARGET_CLIENT_ID]

        response = await sio.call(
            "control",
            {"action": "select", "network": network},
            to=target_sid,
            timeout=5,
        )
        logger.info(response)
        return response
    except Exception as e:
        logger.error(f"Error selecting model '{network}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@cn_router.get("/download/{network_name}")
async def download_model(network_name: str, background_tasks: BackgroundTasks):
    try:
        file_path = guitool.get_model_info(network_name)["model_file"]
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Model file not found")

        model_directory = os.path.dirname(file_path)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as temp_file:
            zipfile_path = temp_file.name

        shutil.make_archive(
            base_name=zipfile_path.rstrip(".zip"),
            format="zip",
            root_dir=model_directory,
        )
        if not os.path.exists(zipfile_path):
            raise HTTPException(status_code=500, detail="Failed to create ZIP file")

        def delete_file(path: str):
            try:
                os.remove(path)
            except Exception as e:
                logger.error(f"Error deleting temporary file: {e}")

        background_tasks.add_task(delete_file, zipfile_path)

        return FileResponse(zipfile_path, filename=f"{network_name}.zip")

    except Exception as e:
        logger.error(f"Error downloading model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


app.include_router(cn_router)


if __name__ == "__main__":

    load_dotenv()
    SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT = int(os.getenv("SERVER_PORT", 3001))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

    uvicorn.run(socket_app, host=SERVER_HOST, port=SERVER_PORT, log_level=LOG_LEVEL, lifespan="on")
