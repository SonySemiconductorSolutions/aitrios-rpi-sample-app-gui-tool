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
import { useNavigate } from "react-router-dom";
import {
  Grid,
  Avatar,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Typography,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  Button,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import CollectionsIcon from "@mui/icons-material/Collections";

import HeaderWithButton from "../layout/HeaderWithButton";
import PageLayout from "../layout/PageLayout";
import { CollectionsProps } from "../../interfaces/CustomNetworkInterfaces";


const Collections = ({
  loading,
  collections,
  onAdd,
  onEdit,
  onDelete,
  onDownload,
}: CollectionsProps) => {
  const navigate = useNavigate();
  const [openedDialog, setOpenDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentCollection, setCurrentCollection] = useState<string | null>(null);

  const openDialog = (isEdit = false) => {
    if (isEdit && currentCollection) {
      setCollectionName(currentCollection);
    } else {
      setCollectionName("");
    }
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setCollectionName("");
    setCurrentCollection(null);
  };

  const handleAddOrEdit = () => {
    if (collectionName.trim() !== "") {
      if (currentCollection) {
        onEdit(currentCollection, collectionName);
      } else {
        onAdd(collectionName);
      }
      closeDialog();
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>, collection: string) => {
    setAnchorEl(event.currentTarget);
    setCurrentCollection(collection);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setCurrentCollection(null);
  };

  const handleMenuItemClick = (action: string) => {
    if (currentCollection) {
      switch (action) {
        case "edit":
          openDialog(true);
          break;
        case "download":
          onDownload(currentCollection);
          break;
        case "delete":
          setShowDeleteDialog(true);
          break;
        default:
          console.log("Unknown action");
      }
    }
    setAnchorEl(null);
  };

  const loadingSkeleton = () => (
    <List sx={{ width: "100%", bgcolor: "background.paper" }}>
      {[1, 2, 3].map((network, index) => (
        <ListItem
          sx={{ bgcolor: "background.default", borderRadius: "15px", mb: 2 }}
          key={index}
          disablePadding
        >
          <ListItemButton role={undefined}>
            <ListItemIcon
              sx={{
                height: 42,
                width: 42,
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
              }}
            >
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

  const renderCollectionList = () => {
    return collections.length > 0 ? (
      <List
        sx={{
          width: "100%",
          overflow: "auto",
          mb: 5,
          maxHeight: { xs: "50vh", md: "40vh" },
          bgcolor: "background.paper",
        }}
      >
        {collections.map((coll, index) => (
          <ListItem
            sx={{ bgcolor: "background.default", borderRadius: "15px", mb: 2 }}
            key={index}
            secondaryAction={
              <>
                <IconButton onClick={(event) => handleClick(event, coll.collection_name)} edge="end" aria-label="settings">
                  <SettingsIcon />
                </IconButton>
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                  <MenuItem onClick={() => handleMenuItemClick("edit")}>
                    <EditIcon /> Edit
                  </MenuItem>
                  <MenuItem onClick={() => handleMenuItemClick("download")}>
                    <DownloadIcon /> Download
                  </MenuItem>
                  <MenuItem onClick={() => handleMenuItemClick("delete")}>
                    <DeleteIcon /> Delete
                  </MenuItem>
                </Menu>
              </>
            }
            disablePadding
          >
            <ListItemButton onClick={() => navigate(`/collections/${coll.collection_name}`)}>
              <ListItemAvatar>
                <Avatar>
                  <CollectionsIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography
                    sx={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      maxWidth: "100%",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {coll.collection_name}
                  </Typography>
                }
                secondary={`${coll.n_images} images`}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    ) : (
      <Box sx={{ paddingBottom: 5 }}>
        <PageLayout bgcolor="background.default">
          <Grid container spacing={2} padding={2}>
            <Grid item xs={12} md={5} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <CollectionsIcon sx={{ fontSize: 150 }} />
            </Grid>
            <Grid item xs={12} md={7} sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "center", md: "flex-start" } }}>
              <div>
                <Typography variant="h5">No Image collections yet</Typography>
                <Typography variant="subtitle1">Press `ADD` to add a Image collection.</Typography>
              </div>
            </Grid>
          </Grid>
        </PageLayout>
      </Box>
    );
  };

  const deleteVerifyDialog = () => (
    <Dialog
      fullWidth
      open={showDeleteDialog}
      onClose={() => {setShowDeleteDialog(false)}}
      aria-labelledby="delete-collection-dialog-title"
      aria-describedby="delete-collection-dialog-description"
    >
      <DialogTitle variant="h5" id="delete-collection-dialog-title">{`Delete ${currentCollection}?`}</DialogTitle>
      <DialogContent>
        <DialogContentText>Are you sure you want to delete this collection?</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {setShowDeleteDialog(false)}}
        >
          Cancel
        </Button>
        <div style={{ flex: "1 0 0" }} />
        <Button color="error" onClick={() => {onDelete(currentCollection); setShowDeleteDialog(false);}}>
          Yes, delete
        </Button>
      </DialogActions>
    </Dialog>
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setCollectionName(value);
  };

  return (
    <>
      <HeaderWithButton
        title="Select collection"
        disableButton={loading}
        onAddButtonClick={() => {setCurrentCollection(""); openDialog(false);}}
      />

      {loading ? loadingSkeleton() : renderCollectionList()}

      {deleteVerifyDialog()}

      <Dialog open={openedDialog} onClose={closeDialog}>
        <DialogTitle>{currentCollection ? "Edit Collection" : "Create New Collection"}</DialogTitle>
        <DialogContent>
          <TextField
            autoComplete="off"
            autoFocus
            fullWidth
            sx={{ mt: 2 }}
            required
            label="Collection name"
            value={collectionName}
            name="collection_name"
            id="collection_name"
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button onClick={handleAddOrEdit} disabled={collectionName === ""}>
            {currentCollection ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Collections;