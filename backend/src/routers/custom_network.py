import json
import logging
import os
import shutil
import tempfile
from io import BytesIO

import git
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from src import CONNECTED_CLIENTS
from src.sio import sio
from src.utils.model_config import ModelConfig
from src.utils.utils import resource_path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

cn_router = APIRouter(prefix="/api/custom-network")

model_config = ModelConfig()


@cn_router.get("/list")
async def list_models():
    try:
        return model_config.config.sections()
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
        model_config.add_model(
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
        return model_config.get_model_info(network_name)
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
        model_config.update_model(
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
        model_config.delete_model(network_name)
        return {"message": f"Model '{network_name}' deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting model '{network_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@cn_router.get("/selected")
async def get_selected_model():
    TARGET_CLIENT_ID = "id-camera"
    try:
        if TARGET_CLIENT_ID not in CONNECTED_CLIENTS:
            raise HTTPException(status_code=404, detail=f"Client '{TARGET_CLIENT_ID}' not found.")

        target_sid = CONNECTED_CLIENTS[TARGET_CLIENT_ID]

        response = await sio.call(
            "control",
            {"action": "get_selected", "sid": target_sid},
            to=target_sid,
            timeout=5,
        )
        if response["selected_model"] is not None:
            return model_config.get_model_info(response["selected_model"])
        else:
            return None
    except Exception as e:
        logger.error(f"Error getting selected model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@cn_router.post("/selected")
async def select_model(network: str = None):
    TARGET_CLIENT_ID = "id-camera"
    try:
        if TARGET_CLIENT_ID not in CONNECTED_CLIENTS:
            raise HTTPException(status_code=404, detail=f"Client '{TARGET_CLIENT_ID}' not found.")

        target_sid = CONNECTED_CLIENTS[TARGET_CLIENT_ID]

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
        file_path = model_config.get_model_info(network_name)["model_file"]
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


@cn_router.post("/download")
async def download_zoo():
    with open(f"{resource_path('assets')}/zoo.json", "r") as file:
        MODEL_ZOO = json.load(file)
        REPO_URL = MODEL_ZOO["repo_url"]

    try:
        # Download and checkout repo if needed.
        ZOO_DIR = f"{os.getenv('MODLIB_HOME', os.path.expanduser('~/.modlib'))}/zoo"
        if not os.path.exists(ZOO_DIR):
            _ = git.Repo.clone_from(REPO_URL, ZOO_DIR)
        else:
            if not os.path.exists(os.path.join(ZOO_DIR, ".git")):
                repo = git.Repo.init(ZOO_DIR)
                origin = repo.create_remote("origin", REPO_URL)
                origin.fetch()
            else:
                repo = git.Repo.init(ZOO_DIR)
                repo.remotes.origin.fetch()
            repo.git.reset("--hard", "origin/main")

    except Exception as e:
        logger.error(f"Error cloning repository '{REPO_URL}': {e}")
        raise HTTPException(status_code=500, detail=str(e))

    for model in MODEL_ZOO["models"]:
        try:
            # Load the model & labels file content
            model_file = os.path.join(ZOO_DIR, model["model_file"])
            with open(model_file, "rb") as f:
                network = UploadFile(filename=os.path.basename(model_file), file=BytesIO(f.read()))

            labels = None
            if model.get("labels_file"):
                labels_path = os.path.join(resource_path("assets"), model["labels_file"])
                with open(labels_path, "rb") as f:
                    labels = UploadFile(filename=os.path.basename(labels_path), file=BytesIO(f.read()))

            # Add models to model_config
            try:
                model_config.add_model(
                    model_name=model["network_name"],
                    model_type=model["network_type"],
                    model_post_processor=model["post_processor"],
                    model_color_format=model["color_format"],
                    model_preserve_aspect_ratio=model["preserve_aspect_ratio"],
                    model=network,
                    labels=labels,
                )
            except:
                logger.info(
                    f"Model with name '{model['network_name']}' already exists. Skipping {model['network_name']} ..."
                )

        except Exception as e:
            logger.warn(f"Could not downloade model: {e}")

    logger.info("Model Zoo downloaded successfully.")
    return {"message": "success"}
