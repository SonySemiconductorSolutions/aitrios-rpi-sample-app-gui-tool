# GUI Tool - Quickstart

The IMX500 GUI Tool is a user-friendly graphical interface designed to interact with the IMX500 Intelligent Vision Sensor. It allows users to deploy a custom network and visualize the output of the chosen model superposed to the camera preview.

## Prerequisites

Before you begin, ensure you have Node.js installed on your system. You can download and install it from [nodejs.org](https://nodejs.org/).

To verify your Node.js installation, run the following command in your terminal:

```
node --version
```

## Building and Starting the GUI Tool

Navigate to the project directory and build the project by running:

```bash
make build
```

To start the GUI Tool, run the following shell script:

```bash
./dist/run.sh
```

After starting it, open your web browser and go to [http://127.0.0.1:3001](http://127.0.0.1:3001) to access the GUI Tool.


## Quickstart Guide

### Adding a Custom Model

1. Click on the `ADD` button located at the top right corner of the interface.
2. Provide the necessary details to add a custom network.
3. Upload the `network.rpk` file, and the (optional) `labels.txt` file.

As an example: Here are some available models from the [Model Zoo](https://github.com/raspberrypi/imx500-models).


| Network Name | Network Type | Post Processor | Color Format | Preserve Aspect Ratio | Network File | Labels File |
|--------------|--------------|-----------------|--------------|------------------------|--------------|-------------|
| **mobilenet_v2** | packaged | pp_cls | RGB | True | [network.rpk](https://github.com/raspberrypi/imx500-models/raw/main/imx500_network_mobilenet_v2.rpk) | [imagenet_labels.txt](https://github.com/google-coral/edgetpu/blob/master/test_data/imagenet_labels.txt) |
| **efficientdet_lite0_pp** | packaged | pp_od_efficientdet_lite0 | RGB | True | [network.rpk](https://github.com/raspberrypi/imx500-models/raw/main/imx500_network_efficientdet_lite0_pp.rpk) | [coco_labels.txt](https://github.com/amikelive/coco-labels/blob/master/coco-labels-paper.txt) |
| **deeplabv3plus** | packaged | pp_segment | RGB | False | [network.rpk](https://github.com/raspberrypi/imx500-models/raw/main/imx500_network_deeplabv3plus.rpk) | - |



### Camera Preview

1. Choose one of your added networks and in the left sidebar, click on Camera preview.
2. Observe the model in action through the camera preview interface!


## Development Environment Setup

1. **Set up the environment**:
   ```bash
   make setup
   ```

2. **Start the application components**:  
    Before starting the different components make sure to create a `.env`-file in the root of this repository and provide the following variables.
    ```
    SERVER_HOST=0.0.0.0
    SERVER_PORT=3001
    LOG_LEVEL=info
    REACT_APP_BACKEND_HOST=http://0.0.0.0:3001
    ```

    Afterwards you are ready to start the following components:
    - **Frontend** (in one terminal)
    ```bash
    make frontend
    ```
    - **Backend** (in another terminal)
    ```bash
    make backend
    ```
    - **Client** (in a third terminal)
    ```bash
    make client
    ```

3. **Check code quality**:
   ```bash
   make lint
   ```

4. **Clean up the environment**:
   ```bash
   make clean
   ```

## License

[LICENSE](./LICENSE)

## Notice

### Security

Please read the Site Policy of GitHub and understand the usage conditions.