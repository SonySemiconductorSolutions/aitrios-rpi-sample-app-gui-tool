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
PYTHON3 := python3

ifeq (, $(shell which npm))
 	$(error "nodejs notfound. To install Node.js, run the following commands: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -; sudo apt install -y nodejs")
endif

ifneq (,$(wildcard .env))
	include .env
endif

setup: .venv-backend .venv-client .setup-frontend


UNIFY_REPO := https://github.com/SonySemiconductorSolutions/aitrios-rpi-sample-app-gui-tool-client-dev.git
UNIFY_BRANCH := main
.unify:
	rm -rf client/unify-*.whl
	@if [ ! -d "unify" ]; then \
		git clone $(UNIFY_REPO) unify; \
	fi
	cd unify
	git checkout $(UNIFY_BRANCH) && git pull
	make build
	cp dist/unify-*.whl ../client

.venv-backend:
	cd backend
	test -d .venv || $(PYTHON3) -m venv .venv
	. .venv/bin/activate && pip install --upgrade pip
	pip install -r requirements.txt

.venv-client: .unify
	cd client
	test -d .venv || $(PYTHON3) -m venv .venv --system-site-packages
	. .venv/bin/activate && pip install --upgrade pip
	pip install -r requirements.txt

.setup-frontend:
	cd frontend && npm install

.check-env:
	$(if $(wildcard .env),, $(error Error: .env file not found. Please create a .env file with necessary environment variables.))

clean:
	rm -rf .venv
	rm -rf unify
	rm -f client/unify-*.whl
	rm -rf client/.venv && rm -rf client/build && rm -rf client/dist && rm -f client/*.spec
	rm -rf backend/.venv && rm -rf backend/build && rm -rf backend/dist && rm -f backend/*.spec
	rm -rf frontend/build && rm -rf frontend/node_modules

lint:
	test -d .venv || ( $(PYTHON3) -m venv .venv && \
	. .venv/bin/activate && pip install --upgrade pip && \
	pip install isort==5.13.2 black==24.4.2 flake8==7.1.0 )
	. .venv/bin/activate && isort . && black . --line-length 120 && flake8
	cd frontend && npm run lint


backend: .check-env
	test -d backend/.venv || make .venv-backend
	cd backend && .venv/bin/python src/main.py
	
client: .check-env
	test -d client/.venv || make .venv-client
	cd client && .venv/bin/python src/client.py

frontend: .check-env
	test -d frontend/node_modules || make .setup-frontend
	cd frontend && export REACT_APP_BACKEND_HOST=$(REACT_APP_BACKEND_HOST) && npm start


.build-frontend:
	rm -rf frontend/build
	cd frontend; npm ci; npm run build

.build-backend: .build-frontend .venv-backend 
	mkdir -p backend/ui && cp -R frontend/build/* backend/ui
	cd backend && . .venv/bin/activate && pip install pyinstaller
	.venv/bin/pyinstaller -n guitool --nowindow --onefile --add-data ui:ui src/main.py

.build-client: .venv-client
	cd client && . .venv/bin/activate && pip install pyinstaller
	.venv/bin/pyinstaller -n client --nowindow --onefile --collect-binaries unify src/client.py

build: .build-backend .build-client
	rm -rf dist && mkdir -p dist
	mv backend/dist/* dist
	mv client/dist/* dist
	cp run.sh dist/; chmod 755 dist/run.sh