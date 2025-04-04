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

import asyncio
import base64
import configparser
import multiprocessing
import os
import signal

import cv2
import socketio
from dotenv import load_dotenv
from src.client_utils import CustomModel

from modlib.devices import AiCamera


class DeviceClient:
    def __init__(self, server_host, server_port):
        self.SERVER_HOST = server_host
        self.SERVER_PORT = server_port

        self.selected_model = None
        self.enable_input_tensor = False

        self.client_id = "id-camera"
        self.sio = None
        self.initialize_sio()
        self.streaming_process = None
        self.queue = multiprocessing.Queue()
        self.cmd_queue = multiprocessing.Queue()
        self.capture_response_queue = multiprocessing.Queue()

    def initialize_sio(self):
        self.sio = socketio.AsyncClient()

        @self.sio.event
        async def connect():
            print(f"Connected to the server. Registering client: {self.client_id}")
            await self.sio.emit("register", {"client_id": self.client_id})

        @self.sio.event
        async def disconnect():
            print("Disconnected from the server")
            self.stop_stream()

        @self.sio.event
        async def control(msg):
            if msg["action"] == "start":
                self.enable_input_tensor = False  # Default
                self.start_stream()
            elif msg["action"] == "stop":
                self.stop_stream()
            elif msg["action"] == "select":
                return self.select_model(msg)
            elif msg["action"] == "get_selected":
                print(f"getting selected model: {self.selected_model}")
                return {"selected_model": self.selected_model}
            elif msg["action"] == "enable_input_tensor":
                # TODO: Handle this in real time using the cmd_queue Without having to restart the device.
                # TODO 2: Disable for models that are converted with input tensor disabled
                self.enable_input_tensor = msg["value"]
                self.stop_stream()
                self.start_stream()

            # Device control event
            else:
                self.cmd_queue.put(msg)

                # Events that require response
                if msg["action"] == "capture":
                    response = await self.loop.run_in_executor(None, self.capture_response_queue.get)
                    return response
                else:
                    return "Device control message added to the command queue."

    async def sio_connect(self, attempts=5, delay=2):
        for attempt in range(1, attempts + 1):
            try:
                await self.sio.connect(f"http://{self.SERVER_HOST}:{self.SERVER_PORT}")
                return True
            except Exception as e:
                print(
                    f"Socketio connection attempt {attempt}/{attempts} failed due to {e}, retrying in {delay} seconds..."
                )
                if attempt == attempts:
                    return False
                await asyncio.sleep(delay * attempt)
        return False

    def select_model(self, msg):
        # TODO: Redo & Verify when model management fully on device
        try:
            model_config = configparser.ConfigParser()
            model_config.read(f"{os.getenv('MODLIB_HOME', os.path.expanduser('~/.modlib'))}/models/models.cfg")
            if msg["network"] is None or model_config.has_section(msg["network"]):
                print(f"selecting model {msg['network']}")
                self.selected_model = msg["network"]
                return {"selected_model": self.selected_model}
            else:
                raise ValueError("Model not found on device.")
        except Exception as e:
            print(f"Failed to get selected model: {str(e)}")
            return {"error": f"Failed to get selected model: {str(e)}"}

    async def run(self):
        connected = await self.sio_connect()
        if not connected:
            print("Failed to connect to the server.")
            return

        self.loop = asyncio.get_event_loop()
        print("Device Client started")

        try:
            await self.sio.wait()
        except asyncio.CancelledError:
            print("Client run cancelled")
        finally:
            await self.sio.disconnect()

    async def process_queue(self):
        while True:
            frame_data = await self.loop.run_in_executor(None, self.queue.get)
            if frame_data is None:
                break

            if self.sio.connected:
                await self.sio.emit("frame", frame_data)
            else:
                print("Not connected to the server, skipping frame emission.")

    def stop_stream(self):
        if self.streaming_process is None or not self.streaming_process.is_alive():
            print("Stream not running.")
            return

        self.queue.put(None)
        self.cmd_queue.put({"action": "shutdown"})
        self.streaming_process.join()
        print("Streaming stopped.")

    def start_stream(self):
        if self.streaming_process is not None and self.streaming_process.is_alive():
            print("Stream is already running, waiting for shutdown")
            self.stop_stream()

        self.loop.create_task(self.process_queue())
        self.streaming_process = multiprocessing.Process(target=self.modlib_run)
        self.streaming_process.start()

    def modlib_run(self):
        device = AiCamera(headless=True, enable_input_tensor=self.enable_input_tensor)
        model = self.get_modlib_model(self.selected_model)
        if model:
            device.deploy(model, overwrite=False)

        with device as stream:
            for frame in stream:
                # Process command queue
                if not self.cmd_queue.empty():
                    msg = self.cmd_queue.get()
                    if msg.get("action") == "capture":
                        ret, buffer = cv2.imencode(
                            ".jpg",
                            (
                                cv2.cvtColor(frame.image, cv2.COLOR_RGB2BGR)
                                if frame.color_format == "RGB"
                                else frame.image
                            ),
                        )
                        self.capture_response_queue.put(
                            {"image": f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"}
                        )
                    elif msg.get("action") == "input_tensor_cropping":
                        device.set_input_tensor_cropping(tuple(msg.get("roi_relative")))
                    elif msg.get("action") == "shutdown":
                        break
                    else:
                        raise ValueError("Unknown control event.")

                ret, buffer = cv2.imencode(
                    ".jpg", cv2.cvtColor(frame.image, cv2.COLOR_RGB2BGR) if frame.color_format == "RGB" else frame.image
                )

                frame_data = {
                    "image": f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}",
                    "detections": frame.detections.json() if model else None,
                    "width": frame.width,
                    "height": frame.height,
                    "roi": frame.roi,
                    "fps": frame.fps,
                    "dps": frame.dps,
                }

                self.queue.put(frame_data)

    @staticmethod
    def get_modlib_model(model_name: str):
        model_config = configparser.ConfigParser()
        model_config.read(f"{os.getenv('MODLIB_HOME', os.path.expanduser('~/.modlib'))}/models/models.cfg")

        if model_config.has_section(model_name):
            return CustomModel(model_config[model_name])
        else:
            return None

    async def shutdown(self):
        # Stop streaming process the queue
        if self.streaming_process and self.streaming_process.is_alive():
            self.queue.put_nowait(None)
            self.cmd_queue.put_nowait({"action": "shutdown"})
            self.streaming_process.join()

        if self.sio:
            await self.sio.disconnect()


def handle_sigterm(client):
    loop = asyncio.get_event_loop()
    loop.call_soon_threadsafe(lambda: asyncio.create_task(client.shutdown()))


if __name__ == "__main__":
    load_dotenv()
    SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT = int(os.getenv("SERVER_PORT", 3001))

    device_client = DeviceClient(server_host=SERVER_HOST, server_port=SERVER_PORT)

    signal.signal(signal.SIGTERM, lambda s, f: handle_sigterm(device_client))
    signal.signal(signal.SIGINT, lambda s, f: handle_sigterm(device_client))

    asyncio.run(device_client.run())
