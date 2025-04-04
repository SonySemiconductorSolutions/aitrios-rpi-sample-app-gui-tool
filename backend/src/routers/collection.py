import logging
import os
import shutil
import tempfile
import uuid
from io import BytesIO
from typing import List

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image
from src.utils.collection_config import CollectionConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

collection_router = APIRouter(prefix="/api/collection")

collection_config = CollectionConfig()


@collection_router.get("/list")
async def list_collections():
    try:
        return collection_config.list_collections()
    except Exception as e:
        logger.error(f"Error listing collections: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@collection_router.post("/list")
async def add_collection(collection_name: str = Form(...)):
    try:
        collection_config.add_collection(collection_name=collection_name)
        return {"message": "Collection created successfully"}
    except Exception as e:
        logger.error(f"Error creating collection '{collection_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@collection_router.get("/list/{collection_name}")
async def get_images_in_collection(collection_name: str):
    try:
        # Construct the path to the collection directory
        collection_directory = os.path.join(collection_config.collection_dir, collection_name)

        # Check if the collection exists
        if not os.path.exists(collection_directory) or not os.path.isdir(collection_directory):
            logger.error(f"Collection '{collection_name}' not found.")
            raise HTTPException(status_code=404, detail="Collection not found.")

        # List all image files in the collection directory
        images = []
        for image_name in os.listdir(collection_directory):
            image_path = os.path.join(collection_directory, image_name)
            if os.path.isfile(image_path):
                # Construct the URL for the image
                image_url = f"/collection/{collection_name}/{image_name}"
                images.append({"name": image_name, "url": image_url})

        return {"images": images}

    except Exception as e:
        logger.error(f"Error retrieving images from collection '{collection_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@collection_router.put("/list/{collection_name}")
async def update_collection(
    collection_name: str,
    new_collection_name: str = Form(None),
):
    try:
        collection_config.update_collection(collection_name=collection_name, new_collection_name=new_collection_name)

        return {"message": f"Collection '{collection_name}' updated successfully"}
    except Exception as e:
        logger.error(f"Error updating collection '{collection_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@collection_router.delete("/list/{collection_name}")
async def delete_collection(collection_name: str):
    try:
        collection_config.delete_collection(collection_name)
        return {"message": f"Collection '{collection_name}' deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting collection '{collection_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@collection_router.post("/list/{collection_name}")
async def upload_images_to_collection(collection_name: str, files: List[UploadFile] = File(...)):
    try:
        collection_directory = os.path.join(collection_config.collection_dir, collection_name)
        if not os.path.exists(collection_directory) or not os.path.isdir(collection_directory):
            logger.error(f"Collection '{collection_name}' not found.")
            raise HTTPException(status_code=404, detail="Collection not found.")

        for file in files:
            if file.content_type not in ["image/jpeg", "image/png"]:
                logger.error(f"File '{file.filename}' is not a JPEG or PNG image.")
                raise HTTPException(status_code=400, detail=f"File '{file.filename}' is not a JPEG or PNG image.")

            # Prepare the image path with a unique filename
            image_path = os.path.join(collection_directory, f"{uuid.uuid4()}.jpeg")

            # Handle JPEG and PNG images
            if file.content_type == "image/jpeg":
                with open(image_path, "wb") as image_file:
                    image_file.write(await file.read())
            elif file.content_type == "image/png":
                # Convert PNG to JPEG
                png_image = Image.open(BytesIO(await file.read())).convert("RGB")
                png_image.save(image_path, "JPEG")

        return {"message": f"Images uploaded successfully to collection '{collection_name}'."}

    except Exception as e:
        logger.error(f"Error uploading images to collection '{collection_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@collection_router.delete("/list/{collection_name}/{image_name}")
async def delete_image_from_collection(collection_name: str, image_name: str):
    try:
        # Construct the path to the image file
        collection_directory = os.path.join(collection_config.collection_dir, collection_name)
        image_path = os.path.join(collection_directory, image_name)

        # Check if the image exists
        if not os.path.exists(image_path):
            logger.error(f"Image '{image_name}' not found in collection '{collection_name}'.")
            raise HTTPException(status_code=404, detail="Image not found.")

        # Delete the image file
        os.remove(image_path)
        logger.info(f"Image '{image_name}' deleted from collection '{collection_name}'.")

        return {"message": f"Image '{image_name}' deleted successfully from collection '{collection_name}'."}

    except Exception as e:
        logger.error(f"Error deleting image '{image_name}' from collection '{collection_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@collection_router.get("/download/{collection_name}")
async def download_collection(collection_name: str, background_tasks: BackgroundTasks):
    try:
        collection_directory = os.path.join(collection_config.collection_dir, collection_name)
        if not os.path.exists(collection_directory) or not os.path.isdir(collection_directory):
            logger.error(f"Collection '{collection_name}' not found or is not a directory.")
            raise HTTPException(status_code=404)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as temp_file:
            zipfile_path = temp_file.name

        shutil.make_archive(
            base_name=zipfile_path.rstrip(".zip"),
            format="zip",
            root_dir=collection_directory,
        )
        if not os.path.exists(zipfile_path):
            raise HTTPException(status_code=500, detail="Failed to create ZIP file")

        def delete_file(path: str):
            try:
                os.remove(path)
            except Exception as e:
                logger.error(f"Error deleting temporary file: {e}")

        background_tasks.add_task(delete_file, zipfile_path)

        return FileResponse(zipfile_path, filename=f"{collection_name}.zip")

    except Exception as e:
        logger.error(f"Error downloading collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))
