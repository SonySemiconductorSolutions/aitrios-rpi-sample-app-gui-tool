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

.ONESHELL:
.PHONY: backend client frontend
SHELL := /bin/bash

ifeq (, $(shell which npm))
 	$(error "nodejs notfound. To install Node.js, run the following commands: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -; sudo apt install -y nodejs")
endif

ifeq (, $(shell which uv))
 	$(error "uv notfound. To install uv, run the following commands: curl -LsSf https://astral.sh/uv/install.sh | sh")
endif

ifneq (,$(wildcard .env))
	include .env
endif

setup: .venv-client .build-frontend
	test -d .venv || uv venv --system-site-packages

.venv-client:
	cd client && test -d .venv || uv venv --system-site-packages

.build-frontend:
	rm -rf frontend/build
	find backend/ui -type f ! -name '.gitkeep' -exec rm -f {} +
	find backend/ui -type d -empty -delete
	npm --prefix frontend ci && npm --prefix frontend run build
	mkdir -p backend/ui && cp -R frontend/build/* backend/ui

clean:
	rm -rf .venv client/.venv backend/.venv
	rm -rf frontend/build frontend/node_modules client/build backend/build
	find backend/ui -type f ! -name '.gitkeep' -exec rm -f {} +
	find backend/ui -type d -empty -delete
	find . -name "__pycache__" -type d -exec rm -rf {} +
	find . -name "*.egg-info" -type d -exec rm -rf {} +

lint:
	test -d .venv || uv venv --system-site-packages
	uv run ruff format
	uv run ruff check --fix
	cd frontend && npm run lint


.check-env:
	$(if $(wildcard .env),, $(error Error: .env file not found. Please create a .env file with necessary environment variables.))

backend: .check-env
	cd backend && uv run -m src.main
	
client: .check-env
	test -d client/.venv || make .venv-client
	cd client && uv run -m src.client

frontend: .check-env
	test -d frontend/node_modules || npm --prefix frontend install
	cd frontend && export REACT_APP_BACKEND_HOST=$(REACT_APP_BACKEND_HOST) && npm start


ARCH := $(shell uname -m)
.appimagetool:
	test $(ARCH) = "aarch64" || { echo "Unsupported architecture: $(ARCH)"; exit 1; }
	cd build
	test -f appimagetool || wget -O appimagetool https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-aarch64.AppImage
	chmod +x appimagetool

build: .appimagetool .build-frontend
	rm -rf build/guitool.AppDir/usr build/guitool.AppDir/.DirIcon build/Guitool-aarch64.AppImage
	mkdir -p build/guitool.AppDir/usr/bin
	mkdir -p build/guitool.AppDir/usr/lib/python3.11/site-packages
	cp -R ./backend ./client ./main.py build/guitool.AppDir/usr/bin/
	pip install git+https://github.com/SonySemiconductorSolutions/aitrios-rpi-application-module-library@main ./backend ./client --target=build/guitool.AppDir/usr/lib/python3.11/site-packages
	cd ./build && ARCH=aarch64 ./appimagetool ./guitool.AppDir
	chmod +x Guitool-aarch64.AppImage