/*
 * Copyright 2024 Sony Semiconductor Solutions Corp. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useState, useContext, useEffect, useRef } from "react";
import { get } from "lodash";
import {
  Box,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

import { NetworkData, EditCustomNetworkProps } from "../../interfaces/CustomNetworkInterfaces";
import NotificationsContext from "../../store/NotificationsContext";

interface State {
  currentNetworkName: string;
  network: NetworkData;
  verify: boolean;
  networkFile: File | null;
  labelsFile: File | null;
}

const EditCustomNetwork = ({ open, selectedNetwork, onClose, onAdd, onSave, onDelete }: EditCustomNetworkProps) => {
  const networkFileRef = useRef();
  const labelFileRef = useRef();

  const initialState: State = {
    currentNetworkName: selectedNetwork.model_name,
    network: selectedNetwork,
    verify: false,
    networkFile: null,
    labelsFile: null,
  };

  const [{ currentNetworkName, network, verify, networkFile, labelsFile }, setState] = useState(initialState);
  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      ...initialState,
      network: selectedNetwork,
      verify: false,
    }));
  }, [open, selectedNetwork]);

  const networkFileName = get(networkFile, "name", null);
  const labelsFileName = get(labelsFile, "name", null);

  const notificationsCtx = useContext(NotificationsContext);
  const errorNotification = notificationsCtx.error;

  const doAdd = async () => {
    if (!(networkFile && networkFile.name && networkFile.name.endsWith(".rpk"))) {
      errorNotification("Invalid file type. Please upload a file with the .rpk extension.");
      return;
    }

    if (labelsFile && !labelsFile.name.endsWith(".txt")) {
      errorNotification("Invalid file type for labels. Please upload a file with the .txt extension.");
      return;
    }

    onAdd({
      network_name: network.model_name,
      network: network,
      networkFile: networkFile,
      labelsFile: labelsFile,
    });
  };

  const doSave = async () => {
    if (networkFile && !networkFile.name.endsWith(".rpk")) {
      errorNotification("Invalid file type. Please upload a file with the .rpk extension.");
      return;
    }

    if (labelsFile && !labelsFile.name.endsWith(".txt")) {
      errorNotification("Invalid file type for labels. Please upload a file with the .txt extension.");
      return;
    }

    onSave({
      network_name: currentNetworkName,
      network: network,
      networkFile: networkFile,
      labelsFile: labelsFile,
    });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setState((prevState) => ({
      ...prevState,
      network: {
        ...prevState.network,
        [name]: value,
      },
    }));
  };

  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    setState((prevState) => ({
      ...prevState,
      network: {
        ...prevState.network,
        [name]: value,
      },
    }));
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setState((prevState) => ({
      ...prevState,
      network: {
        ...prevState.network,
        [name]: checked,
      },
    }));
  };

  const changeNetworkFileHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState((prevState) => ({
      ...prevState,
      networkFile: event.target.files[0],
    }));
  };

  const changeLabelFileHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState((prevState) => ({
      ...prevState,
      labelsFile: event.target.files[0],
    }));
  };

  const selectFileButton = (
    title: string,
    fileName: string | null,
    ref: React.RefObject<HTMLInputElement>,
    accept: string,
    onUploadClick: (event: React.ChangeEvent<HTMLInputElement>) => void,
    optional = false
  ) => {
    return (
      <Grid container padding={1} spacing={2}>
        <Grid item xs={12} md={6} sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "center", md: "flex-end" } }}>
          <div>
            <Typography variant="h6">{title}</Typography>
            {optional && (
              <Box sx={{ display: "flex", justifyContent: { xs: "center", md: "flex-end" } }}>
                <Typography variant="subtitle2" fontStyle="italic">
                  {"(optional)"}
                </Typography>
              </Box>
            )}
          </div>
        </Grid>
        <Grid item xs={12} md={6} sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "center", md: "flex-start" } }}>
          <input style={{ display: "none" }} ref={ref} type="file" multiple accept={accept} onChange={onUploadClick} />
          <Button variant="contained" onClick={() => ref.current?.click()}>
            {fileName ? fileName : "Select"}
          </Button>
        </Grid>
      </Grid>
    );
  };

  const createDisabled =
    !network.model_name || !network.model_type || !network.model_post_processor || !network.model_color_format || !networkFile;

  return (
    <Dialog
      fullWidth
      open={open}
      onClose={onClose}
      aria-labelledby="edit-network-dialog-title"
      aria-describedby="edit-network-dialog-description"
    >
      {currentNetworkName !== "" ? (
        <DialogTitle id="edit-network-dialog-title">{`Edit ${network.model_name}`}</DialogTitle>
      ) : (
        <DialogTitle variant="h5" id="edit-network-dialog-title">{`Add network`}</DialogTitle>
      )}
      {verify ? (
        <>
          <DialogContent>
            <DialogContentText>Are you sure?</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setState((prevState) => ({ ...prevState, verify: false }))}>Cancel</Button>
            <div style={{ flex: "1 0 0" }} />
            <Button color="error" disabled={currentNetworkName === ""} onClick={() => onDelete(currentNetworkName)}>
              Yes, delete
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent>
            <TextField
              autoComplete="off"
              autoFocus
              fullWidth
              sx={{ mt: 2 }}
              required
              label="Network name"
              value={network.model_name}
              name="model_name"
              id="model_name"
              onChange={handleInputChange}
            />
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Model type</InputLabel>
              <Select value={network.model_type} name="model_type" onChange={handleSelectChange}>
                <MenuItem value="packaged">Packaged</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Post Processor</InputLabel>
              <Select value={network.model_post_processor} name="model_post_processor" onChange={handleSelectChange}>
                <MenuItem value="pp_cls">Classification</MenuItem>
                <MenuItem value="pp_cls_softmax">Classification (Softmax)</MenuItem>
                <MenuItem value="pp_od_bcsn">Object Detection (BCSN)</MenuItem>
                <MenuItem value="pp_od_bscn">Object Detection (BSCN)</MenuItem>
                <MenuItem value="pp_od_efficientdet_lite0">Object Detection (EfficientDet Lite0)</MenuItem>
                <MenuItem value="pp_posenet">Pose Estimation</MenuItem>
                <MenuItem value="pp_segment">Segmentation</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Color Format</InputLabel>
              <Select value={network.model_color_format} name="model_color_format" onChange={handleSelectChange}>
                <MenuItem value="RGB">RGB</MenuItem>
                <MenuItem value="BGR">BGR</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={network.model_preserve_aspect_ratio}
                  name="model_preserve_aspect_ratio"
                  onChange={handleCheckboxChange}
                />
              }
              label="Preserve Aspect Ratio"
              sx={{ mt: 2 }}
            />
            {selectFileButton("Select network.rpk file", networkFileName, networkFileRef, ".rpk", changeNetworkFileHandler)}
            {selectFileButton("Select labels.txt file", labelsFileName, labelFileRef, ".txt", changeLabelFileHandler, true)}
          </DialogContent>
          {currentNetworkName === "" ? (
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <div style={{ flex: "1 0 0" }} />
              <Button color="success" disabled={createDisabled} onClick={() => doAdd()}>
                Create
              </Button>
            </DialogActions>
          ) : (
            <DialogActions>
              <Button color="error" onClick={() => setState((prevState) => ({ ...prevState, verify: true }))}>
                Delete
              </Button>
              <div style={{ flex: "1 0 0" }} />
              <Button onClick={onClose}>Cancel</Button>
              <Button color="success" disabled={network.model_name == ""} onClick={() => doSave()}>
                Save
              </Button>
            </DialogActions>
          )}
        </>
      )}
    </Dialog>
  );
};

export default EditCustomNetwork;
