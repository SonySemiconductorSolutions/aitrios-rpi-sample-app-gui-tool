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

import { createTheme } from "@mui/material";

export const MuiTheme = createTheme({
  typography: {
    fontFamily: "Times New Roman, serif",
    fontWeightMedium: 700,
    fontWeightRegular: 700,
    fontSize: 14,
  },
  palette: {
    mode: "dark",
    primary: {
      main: "#3179FF",
    },
    background: {
      default: "#161C27",
      paper: "#232A37",
    },
    text: {
      primary: "#ffffff",
      secondary: "#B0B7C3",
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: "#232A37",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: "15px",
          "&.Mui-selected": {
            backgroundColor: "#1d325b",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "15px",
          padding: "15px 30px 15px 30px",
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 60,
          height: 30,
          padding: 0,
          display: "flex",
          "&:active": {
            "& .MuiSwitch-thumb": {
              width: 30,
            },
            "& .MuiSwitch-switchBase.Mui-checked": {
              transform: "translateX(9px)",
            },
          },
          "& .MuiSwitch-switchBase": {
            padding: 5,
            "&.Mui-checked": {
              transform: "translateX(29px)",
              color: "#fff",
              "& + .MuiSwitch-track": {
                opacity: 1,
                backgroundColor: "#3179FF",
              },
            },
          },
          "& .MuiSwitch-thumb": {
            boxShadow: "0 2px 4px 0 rgb(0 35 11 / 20%)",
            width: 20,
            height: 20,
            borderRadius: 10,
          },
          "& .MuiSwitch-track": {
            borderRadius: 30 / 2,
            opacity: 1,
            backgroundColor: "rgba(0,0,0,.25)",
            boxSizing: "border-box",
          },
        },
      },
    },
  },
});
