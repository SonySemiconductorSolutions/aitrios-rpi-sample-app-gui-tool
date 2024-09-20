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

import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Radio,
  Skeleton,
  Typography,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";

import HeaderWithButton from "../layout/HeaderWithButton";
import { CustomNetworkProps } from "../../interfaces/CustomNetworkInterfaces";

const CustomNetwork = ({
  loading,
  networks,
  selectedNetwork,
  selectNetwork,
  onDownloadCustomNetwork,
  onDeleteCustomNetwork,
  onAddCustomNetwork,
  onEditCustomNetwork,
  onDownloadZoo,
}: CustomNetworkProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [network, setNetwork] = useState<null | string>(null);
  const [showDialog, setShowDialog] = useState<null | boolean>(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>, network: string) => {
    setAnchorEl(event.currentTarget);
    setNetwork(network);
  };

  const handleClose = () => {
    setNetwork(null);
    setAnchorEl(null);
  };

  const handleMenuItemClick = (action: string) => {
    if (action === "edit") {
      onEditCustomNetwork(network);
    } else if (action === "download") {
      onDownloadCustomNetwork(network);
    } else if (action === "delete") {
      setShowDialog(true);
      setAnchorEl(null);
    }
    action !== "delete" && handleClose();
  };

  const onDelete = () => {
    onDeleteCustomNetwork(network);
    setNetwork(null);
    setShowDialog(false);
  };

  const selectNetworkHandler = (e: React.MouseEvent<HTMLElement>) => {
    selectNetwork(e.currentTarget.textContent as string);
  };

  const renderNetworkList = () => {
    return (
      <List sx={{ width: "100%", bgcolor: "background.paper" }}>
        {networks.map((network, index) => {
          const isSelected = selectedNetwork && selectedNetwork.model_name === network;
          return (
            <ListItem
              sx={{ bgcolor: "background.default", borderRadius: "15px", mb: 2, border: isSelected ? `3px solid #3179FF` : null }}
              key={index}
              secondaryAction={
                <>
                  <IconButton onClick={(event) => handleClick(event, network)} edge="end" aria-label="comments">
                    <SettingsIcon />
                  </IconButton>
                  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                    <MenuItem onClick={() => handleMenuItemClick("edit")}>
                      <ListItemIcon>
                        <EditIcon />
                      </ListItemIcon>
                      Edit
                    </MenuItem>
                    <MenuItem onClick={() => handleMenuItemClick("download")}>
                      <ListItemIcon>
                        <DownloadIcon />
                      </ListItemIcon>
                      Download
                    </MenuItem>
                    <MenuItem onClick={() => handleMenuItemClick("delete")}>
                      <ListItemIcon>
                        <DeleteIcon />
                      </ListItemIcon>
                      Delete
                    </MenuItem>
                  </Menu>
                </>
              }
              disablePadding
            >
              <ListItemButton onClick={selectNetworkHandler} role={undefined}>
                <ListItemIcon>
                  <Radio
                    edge="start"
                    checked={isSelected}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ "aria-labelledby": network + "_" + index }}
                  />
                </ListItemIcon>
                <ListItemText
                  id={"labelId_" + index}
                  primary={
                    <Typography
                      sx={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        maxWidth: "100%",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {network}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    );
  };

  const loadingSkeleton = () => {
    return (
      <List sx={{ width: "100%", bgcolor: "background.paper" }}>
        {[1, 2, 3].map((network, index) => (
          <ListItem sx={{ bgcolor: "background.default", borderRadius: "15px", mb: 2 }} key={index} disablePadding>
            <ListItemButton role={undefined}>
              <ListItemIcon sx={{ height: 42, width: 42, display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
                <Skeleton variant="circular" width={20} height={20} />
              </ListItemIcon>
              <Typography>
                <Skeleton width={"40vw"} />
              </Typography>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    );
  };

  const deleteVerifyDialog = () => {
    return (
      <Dialog
        fullWidth
        open={showDialog}
        onClose={() => setShowDialog(false)}
        aria-labelledby="edit-network-dialog-title"
        aria-describedby="edit-network-dialog-description"
      >
        <DialogTitle variant="h5" id="edit-network-dialog-title">{`Delete ${network}`}</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowDialog(false);
              setNetwork(null);
            }}
          >
            Cancel
          </Button>
          <div style={{ flex: "1 0 0" }} />
          <Button color="error" onClick={() => onDelete()}>
            Yes, delete
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <>
      <HeaderWithButton
        title="Select network"
        disableButton={loading}
        onAddButtonClick={onAddCustomNetwork}
        onDownloadButtonClick={onDownloadZoo}
      />
      {deleteVerifyDialog()}
      {loading ? loadingSkeleton() : renderNetworkList()}
    </>
  );
};

export default CustomNetwork;
