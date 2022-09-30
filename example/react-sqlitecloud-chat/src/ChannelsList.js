//core
import React, { Fragment, useEffect, useState } from "react";
//mui
import LinearProgress from '@mui/material/LinearProgress';
import Grid from '@mui/material/Unstable_Grid2';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');

const ChannelsList = ({ channelsList }) => {
  if (config.debug.renderingProcess) utils.logThis("ChannelsList: ON RENDER");

  return (
    <Grid sx={{
      width: '100%',
      maxWidth: '437px',
    }}>
      {
        channelsList == undefined &&
        <LinearProgress />
      }
      {
        channelsList !== undefined &&
        <>
          {
            channelsList.columns.map((channel, i) => <div key={i}>{channel}</div>)
          }
        </>
      }
    </Grid>
  );
}


export default ChannelsList;