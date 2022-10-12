//core
import React, { Fragment, useEffect, useState, useContext } from "react";
//react-router
import { useSearchParams } from 'react-router-dom';
//mui
import { useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { green } from '@mui/material/colors';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');
//SqliteCloud context
import { StateContext } from "./context/StateContext"
//SqliteCloud componets


const MessagesBar = ({ channel, setOpenMobMsg }) => {
  if (config.debug.renderingProcess) utils.logThis("MessagesBar: ON RENDER");
  const theme = useTheme();
  console.log(theme.palette.primary.contrastText)
  const accent = green[500];
  const white = "#FFF";

  //read from context all channels registered  
  const { chsMap } = useContext(StateContext);
  //react router hooks used to set and get query string
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <AppBar elevation={0} position="absolute">
      <Toolbar>
        <IconButton
          onClick={() => { setOpenMobMsg(false) }}
          aria-label="back"
          size="large"
          sx={{
            display: { sx: 'block', sm: 'none' },
            color: theme.palette.primary.contrastText
          }}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar
          aria-label="channel-name"
          sx={{
            mr: 2,
            bgcolor: accent,
            color: white
          }}
        >
          {channel.charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {channel}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}


export default MessagesBar;