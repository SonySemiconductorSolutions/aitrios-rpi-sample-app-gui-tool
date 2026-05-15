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

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";
import useHttpNotifications from "../hooks/use-http-notifications";
import { Button, Grid, Typography } from "@mui/material";
import { ImageList, ImageListItem, ImageListItemBar, IconButton, Box, Stack } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import UploadIcon from "@mui/icons-material/Upload";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";
import CollectionsIcon from "@mui/icons-material/Collections";


const BACKEND_HOST = import.meta.env.REACT_APP_BACKEND_HOST ?? "";


interface Image {
    name: string;
    url: string;
}
  
interface CollectionState {
    collection: {
        images: Image[];
    };
}

const CollectionDetailPage = () => {
    const navigate = useNavigate();
    const { sendRequest } = useHttpNotifications();
    const { collection_name } = useParams<{ collection_name: string }>();
    const [state, setState] = useState<CollectionState>({ collection: { images: [] } });
    const [imageIndex, setImageIndex] = useState(0);
    const steppingSize = 20;

    useEffect(() => {
        sendRequest(
          {
            url: `${BACKEND_HOST}/api/collection/list/${collection_name}`,
          },
          (data: { images: Image[] }) => {
            setState((prevState) => ({
                ...prevState,
                collection: { images: data.images },
              }));
            },
            false
          );
        }, [sendRequest]);

    const goBack = () => {
        setImageIndex((prevIndex) => Math.max(prevIndex - steppingSize, 0));
    };

    const goNext = () => {
        setImageIndex((prevIndex) => Math.min(prevIndex + steppingSize, state.collection.images.length - 1));
    };

    const deleteImage = (img: Image) => {
        sendRequest(
            {
              url: `${BACKEND_HOST}/api/collection/list/${collection_name}/${img.name}`,
              method: 'DELETE'
            },
            () => {
                setState((prevState) => ({
                    ...prevState,
                    collection: {
                        images: prevState.collection.images.filter((i) => i.name !== img.name),
                    },
                }));
            },
            false
        );
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }

            sendRequest(
                {
                    url: `${BACKEND_HOST}/api/collection/list/${collection_name}`,
                    method: 'POST',
                    data: formData
                },
                () => {
                    sendRequest(
                        {
                          url: `${BACKEND_HOST}/api/collection/list/${collection_name}`,
                        },
                        (data: { images: Image[] }) => {
                            setState((prevState) => ({
                                    ...prevState,
                                    collection: { images: data.images },
                                }));
                            },
                        false
                    );
                },
            );
        }
    };

    const goCapture = () => {
        // Deselect any running model
        sendRequest(
            {
              url: `${BACKEND_HOST}/api/custom-network/selected`,
              method: "POST",
              data: null
            },
            () => {},
            false
        );

        // Camera preview in advanced view
        navigate('/camera-preview', { state: { collection_name, expanded: true } })
    }

    const currentPics = state.collection ? state.collection.images.slice(imageIndex, imageIndex + steppingSize) : [];

    return (
        <PageLayout>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography
                    sx={{ color: "text.secondary", textTransform: "uppercase", textAlign: "start", paddingTop: 2, paddingBottom: 2 }}
                >
                    {collection_name}
                </Typography>
                <IconButton onClick={() => {navigate("/collections")}}>
                    <ChevronLeftIcon />
                </IconButton>
            </Box>
            {state.collection && state.collection.images.length > 0 ? (
                <ImageList cols={3} sx={{ height: "40vh" }}>
                    {imageIndex > 0 && (
                        <Box
                            onClick={goBack}
                            sx={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 2 }}
                        >
                            <Button startIcon={<ChevronLeftIcon />} variant="outlined">
                                Back
                            </Button>
                        </Box>
                    )}
                    {currentPics.map((img: Image, i: number) => (
                        <ImageListItem key={i}>
                            <img 
                                src={`${BACKEND_HOST}${img.url}`}
                                alt={img.name} 
                                onError={(e) => {
                                    console.error("Image failed to load:", img.url);
                                    e.currentTarget.style.display = 'none';
                                }} 
                            />
                            <ImageListItemBar
                                title={img.name}
                                actionIcon={
                                    <IconButton onClick={() => deleteImage(img)}>
                                        <CloseIcon />
                                    </IconButton>
                                }
                            />
                        </ImageListItem>
                    ))}
                    {imageIndex + steppingSize < state.collection.images.length && (
                        <Box
                            onClick={goNext}
                            sx={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 2 }}
                        >
                            <Button endIcon={<ChevronRightIcon />} variant="outlined">
                                Next
                            </Button>
                        </Box>
                    )}
                </ImageList>
            ) : (
                <Grid container spacing={2} padding={2}>
                    <Grid item xs={12} md={5} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <CollectionsIcon sx={{ fontSize: 150 }} />
                    </Grid>
                    <Grid item xs={12} md={7} sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "center", md: "flex-start" } }}>
                    <div>
                        <Typography variant="h5">No images yet</Typography>
                        <Typography variant="subtitle1">
                            Press `Upload` to add images to your collection.
                            Or capture pictures in the Camera preview.
                        </Typography>
                    </div>
                    </Grid>
                </Grid>
            )}

            <Box sx={{ paddingTop: 5, justifyContent: "center", display: "flex" }}>
                <Stack direction="row" spacing={2}>
                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="upload-button"
                    />
                    <label htmlFor="upload-button">
                        <Button variant="contained" startIcon={<UploadIcon />} component="span">
                            Upload
                        </Button>
                    </label>
                    <Button
                        variant="contained"
                        endIcon={<AddAPhotoIcon />}
                        onClick={goCapture}
                    >
                        Capture
                    </Button>
                </Stack>
            </Box>

        </PageLayout>
    );
};

export default CollectionDetailPage;
