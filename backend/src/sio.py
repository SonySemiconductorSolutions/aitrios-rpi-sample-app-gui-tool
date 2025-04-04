import logging

import socketio
from src import CONNECTED_CLIENTS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    for client_id, client_sid in CONNECTED_CLIENTS.items():
        if client_sid == sid:
            del CONNECTED_CLIENTS[client_id]
            break


@sio.event
async def register(sid, data):
    client_id = data.get("client_id")
    if client_id:
        CONNECTED_CLIENTS[client_id] = sid
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
