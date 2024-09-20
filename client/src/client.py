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
from client_utils import CustomModel
from dotenv import load_dotenv
from unify.devices import AiCamera


class DeviceClient:
    def __init__(self, server_host, server_port):
        self.SERVER_HOST = server_host
        self.SERVER_PORT = server_port
        self.selected_model = None
        self.client_id = "id-camera"
        self.sio = None
        self.initialize_sio()
        self.streaming_process = None
        self.queue = multiprocessing.Queue()

    def initialize_sio(self):
        self.sio = socketio.AsyncClient()

        @self.sio.event
        async def connect():
            print(f"Connected to the server. Registering client: {self.client_id}")
            await self.sio.emit("register", {"client_id": self.client_id})

        @self.sio.event
        async def disconnect():
            print("Disconnected from the server. Attempting to reconnect")
            # Pause the queue processing until reconnection
            self.queue.put(None)

        @self.sio.event
        async def control(msg):
            if msg["action"] == "start":
                self.start_stream()
            elif msg["action"] == "stop":
                self.stop_stream()
            elif msg["action"] == "select":
                return self.select_model(msg)
            elif msg["action"] == "get_selected":
                print(f"getting selected model: {self.selected_model}")
                return {"selected_model": self.selected_model}
            else:
                raise ValueError("Unknown control event.")

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
            model_config.read(f"{os.getenv('UNIFY_HOME', os.path.expanduser('~/.unify'))}/models/models.cfg")
            if model_config.has_section(msg["network"]):
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
            await self.sio.emit("frame", frame_data)

    def stop_stream(self):
        if self.streaming_process is None or not self.streaming_process.is_alive():
            print("Stream not running.")
            return

        print("Stopping Stream")
        self.queue.put(None)
        os.kill(self.streaming_process.pid, signal.SIGKILL)

    def start_stream(self):
        if self.streaming_process is not None and self.streaming_process.is_alive():
            print("Stream is already running, waiting for shutdown")
            self.queue.put(None)
            os.kill(self.streaming_process.pid, signal.SIGKILL)
            self.streaming_process.join()

        self.loop.create_task(self.process_queue())
        self.streaming_process = multiprocessing.Process(target=self.unify_run)
        self.streaming_process.start()

    def unify_run(self):

        device = self.get_unify_device()
        model = self.get_unify_model(self.selected_model)
        device.deploy(model)

        with device as stream:
            for frame in stream:

                ret, buffer = cv2.imencode(
                    ".jpg",
                    cv2.putText(
                        cv2.putText(
                            (
                                cv2.cvtColor(frame.image, cv2.COLOR_RGB2BGR)
                                if frame.color_format == "RGB"
                                else frame.image
                            ),
                            f"FPS: {frame.fps:.2f}",
                            (10, 20),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.30,
                            (0, 0, 0),
                            1,
                            cv2.LINE_AA,
                        ),
                        f"DPS: {frame.dps:.2f}",
                        (10, 40),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.30,
                        (0, 0, 0),
                        1,
                        cv2.LINE_AA,
                    ),
                )

                frame_data = {
                    "image": f'data:image/jpeg;base64,{base64.b64encode(buffer).decode("utf-8")}',
                    "detections": frame.detections.json(),
                    "width": frame.width,
                    "height": frame.height,
                }

                self.queue.put(frame_data)

    @staticmethod
    def get_unify_model(model_name: str):
        model_config = configparser.ConfigParser()
        model_config.read(f"{os.getenv('UNIFY_HOME', os.path.expanduser('~/.unify'))}/models/models.cfg")

        if model_config.has_section(model_name):
            return CustomModel(model_config[model_name])
        else:
            raise ValueError("Cannot find model.")

    @staticmethod
    def get_unify_device():
        # TODO: identify device automatically
        return AiCamera(headless=False)

    async def shutdown(self):
        # Stop streaming process the queue
        if self.streaming_process and self.streaming_process.is_alive():
            self.queue.put_nowait(None)
            os.kill(self.streaming_process.pid, signal.SIGKILL)


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
