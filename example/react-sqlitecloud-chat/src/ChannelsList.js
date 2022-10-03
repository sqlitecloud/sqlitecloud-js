//core
import React, { Fragment, useEffect, useState } from "react";
//mui
import LinearProgress from '@mui/material/LinearProgress';
import Grid from '@mui/material/Unstable_Grid2';
import Paper from '@mui/material/Paper';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');
//SqliteCloute Components
import ChannelElement from './ChannelElement'

const ChannelsList = ({ liter, channelsList }) => {
  if (config.debug.renderingProcess) utils.logThis("ChannelsList: ON RENDER");
  const [selectedChannel, setSelectedChannel] = useState(-1);
  return (
    <Paper elevation={3}
      sx={{
        width: '100%',
        height: '100%',
        maxWidth: '437px',
      }}
    >
      {
        channelsList == undefined &&
        <LinearProgress />
      }
      {
        channelsList !== undefined &&
        <>
          {
            channelsList.columns.map((channel, i) => <ChannelElement key={0} index={0} liter={liter} name={channel + "0"} selectionState={selectedChannel == 0} setSelectedChannel={setSelectedChannel} />)
          }
          {
            channelsList.columns.map((channel, i) => <ChannelElement key={1} index={1} liter={liter} name={channel + "1"} selectionState={selectedChannel == 1} setSelectedChannel={setSelectedChannel} />)
          }
          {
            channelsList.columns.map((channel, i) => <ChannelElement key={2} index={2} liter={liter} name={channel + "2"} selectionState={selectedChannel == 2} setSelectedChannel={setSelectedChannel} />)
          }
          {
            channelsList.columns.map((channel, i) => <ChannelElement key={3} index={3} liter={liter} name={channel + "3"} selectionState={selectedChannel == 3} setSelectedChannel={setSelectedChannel} />)
          }
        </>
      }
    </Paper>
  );
}


export default ChannelsList;