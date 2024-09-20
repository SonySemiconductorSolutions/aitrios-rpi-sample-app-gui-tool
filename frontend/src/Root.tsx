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

import { ReactNode, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  BoxProps as MuiBoxProps,
  Drawer as MuiDrawer,
  AppBar as MuiAppBar,
  AppBarProps as MuiAppBarProps,
  Toolbar,
  List,
  CssBaseline,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
} from "@mui/material";

import { styled, useTheme, Theme, CSSObject } from "@mui/material/styles";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import VideocamIcon from "@mui/icons-material/Videocam";
import HomeRepairServiceIcon from "@mui/icons-material/HomeRepairService";
import NotificationsList from "./components/notification/NotificationsList";

const drawerWidth = "25vw";
const compressedDrawerWidth = "64px";

const openedMixin = (theme: Theme): CSSObject => ({
  [theme.breakpoints.up("md")]: {
    width: drawerWidth,
  },
  [theme.breakpoints.down("md")]: {
    width: `80%`,
    zIndex: 100,
    position: "fixed",
  },
  [theme.breakpoints.down("sm")]: {
    width: `100%`,
  },
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: 0,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  position: "relative",
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme, open }) => ({
  boxShadow: "none",
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth})`,
    [theme.breakpoints.up("md")]: {
      width: `calc(100% - ${drawerWidth})`,
    },
    [theme.breakpoints.down("md")]: {
      maxWidth: "20%",
    },
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== "open" })(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme),
  }),
}));

interface ContentContainerProps extends MuiBoxProps {
  open?: boolean;
}

const ContentContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "open",
})<ContentContainerProps>(({ theme, open }) => ({
  flexGrow: 1,
  p: 3,
  maxWidth: `calc(100% - ${compressedDrawerWidth})`,
  [theme.breakpoints.down("sm")]: {
    maxWidth: "100%",
  },
  ...(open && {
    [theme.breakpoints.up("md")]: {
      maxWidth: `calc(100% - ${drawerWidth})`,
      padding: "0 20px 0 20px",
    },
    [theme.breakpoints.down("md")]: {
      maxWidth: "100%",
    },
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  }),
}));

interface LinkListItemProps {
  text: string;
  icon: ReactNode;
  open: boolean;
  selected: boolean;
  onClick: () => void;
}

const LinkListItem = ({ text, icon, open, selected, onClick }: LinkListItemProps) => {
  return (
    <ListItem key={text} onClick={onClick} disablePadding sx={{ display: "block", padding: "10px 15px 10px 15px" }}>
      <ListItemButton
        selected={selected}
        sx={{
          minHeight: 60,
          justifyContent: open ? "initial" : "center",
          px: 2.5,
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            mr: open ? 3 : "auto",
            justifyContent: "center",
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText primaryTypographyProps={{ fontSize: "2em" }} primary={text} sx={{ opacity: open ? 1 : 0 }} />
      </ListItemButton>
    </ListItem>
  );
};

const linkTabs = [
  { to: "/custom-network", text: "Custom network", icon: <HomeRepairServiceIcon /> },
  { to: "/camera-preview", text: "Camera preview", icon: <VideocamIcon /> },
];

const Root = () => {
  const theme = useTheme();
  const shouldCloseDrawer = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen] = useState(true);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { id } = params;
  const currentIndex = linkTabs.findIndex((f) => location.pathname.includes(f.to));
  const currentTitle = currentIndex === -1 ? "Settings" : linkTabs[currentIndex].text;

  const goTo = (to: string) => {
    if (shouldCloseDrawer) {
      setOpen(!open);
    }
    if (!location.pathname.includes(to)) {
      navigate(to);
    }
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar sx={{ bgcolor: "background.default" }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 5,
              ...(open && { display: "none" }),
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography sx={{ m: 3 }} variant={shouldCloseDrawer ? "h5" : "h4"} noWrap component="div">
            {currentTitle}
            {id && ` - ${id}`}
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <Typography
            fontWeight="bold"
            variant={shouldCloseDrawer ? "h5" : "h4"}
            align="center"
            sx={{ m: 3, userSelect: "none", cursor: "default", fontSize: "3em" }}
          >
            IMX500
          </Typography>
          <IconButton sx={{ position: "absolute", right: "5px" }} onClick={handleDrawerClose}>
            {theme.direction === "rtl" ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </DrawerHeader>
        <List>
          {linkTabs.map((tab, index) => (
            <LinkListItem
              key={tab.text}
              selected={index === currentIndex}
              text={tab.text}
              icon={tab.icon}
              open={open}
              onClick={() => goTo(tab.to)}
            />
          ))}
        </List>
      </Drawer>
      <ContentContainer open={open} component="main">
        <DrawerHeader />
        <NotificationsList />
        <Outlet />
      </ContentContainer>
    </Box>
  );
};

export default Root;
