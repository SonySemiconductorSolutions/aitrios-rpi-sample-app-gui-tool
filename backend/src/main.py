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
from pathlib import Path
from typing import Union

import socketio
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from src.routers.collection import collection_config, collection_router
from src.routers.controls import control_router
from src.routers.custom_network import cn_router
from src.sio import sio
from src.utils.utils import resource_path
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


def mount_react_app(app: FastAPI, build_dir: Union[Path, str]) -> FastAPI:
    if isinstance(build_dir, str):
        build_dir = Path(build_dir)

    app.mount("/ui/static/", StaticFiles(directory=build_dir / "static"), name="ui")
    templates = Jinja2Templates(directory=build_dir.as_posix())

    @app.get("/ui/{full_path:path}")
    async def mount_react_app(request: Request, full_path: str):
        return templates.TemplateResponse("index.html", {"request": request})

    return app


ui_folder = resource_path("ui")
collection_folder = resource_path(collection_config.collection_dir)
app = mount_react_app(app, ui_folder)
app.mount("/collection", StaticFiles(directory=collection_folder), name="collection")
socket_app = socketio.ASGIApp(sio, app)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/ui")


app.include_router(cn_router)
app.include_router(collection_router)
app.include_router(control_router)


if __name__ == "__main__":
    load_dotenv()
    SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT = int(os.getenv("SERVER_PORT", 3001))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

    try:
        uvicorn.run(socket_app, host=SERVER_HOST, port=SERVER_PORT, log_level=LOG_LEVEL, lifespan="on")
    except KeyboardInterrupt:
        print("Backend shut down gracefully.")
    finally:
        print("Cleanup completed.")
