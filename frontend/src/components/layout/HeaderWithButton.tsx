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

import { Grid, Button, Typography } from "@mui/material";

interface HeaderWithButtonProps {
  title: string;
  onAddButtonClick?: () => void;
  onDownloadButtonClick?: () => void;
  disableButton?: boolean;
}

const HeaderWithButton = ({ title, onAddButtonClick, onDownloadButtonClick, disableButton }: HeaderWithButtonProps) => {
  return (
    <Grid container sx={{ display: "flex", alignItems: "center", mb: 2 }}>
      <Grid item xs={8} md={6}>
        <Typography sx={{ color: "text.secondary", textTransform: "uppercase", textAlign: "start", paddingTop: 2, paddingBottom: 2 }}>
          {title}
        </Typography>
      </Grid>
      {(onAddButtonClick || onDownloadButtonClick) && (
        <Grid item xs={4} md={6} sx={{ display: "flex", justifyContent: "flex-end" }}>
          {/* <Button
            sx={{ paddingTop: "7px", paddingBottom: "7px", marginRight: 2 }}
            variant="contained"
            disabled={disableButton}
            onClick={onDownloadButtonClick}
          >
            Download Zoo
          </Button> */}
          <Button sx={{ paddingTop: "7px", paddingBottom: "7px" }} variant="contained" disabled={disableButton} onClick={onAddButtonClick}>
            Add
          </Button>
        </Grid>
      )}
    </Grid>
  );
};

export default HeaderWithButton;
