//core
import React, { Fragment, useEffect, useState } from "react";
//mui
import LinearProgress from '@mui/material/LinearProgress';
import Grid from '@mui/material/Unstable_Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
//SqliteCloud
import { logThis } from './utils';
//SqliteCloute Components
import ChannelElement from './ChannelElement'

const ChannelsList = ({ liter, channelsList, setSelectedChannel, setOpenMobMsg, selectedChannelIndex, setSelectedChannelIndex }) => {
  if (process.env.DEBUG == "true") logThis("ChannelsList: ON RENDER");
  return (
    <Grid
      sx={{
        width: '100%',
        height: '100%',
        maxWidth: { xs: '100%', sm: '437px' },
        overflowY: 'scroll'
      }}
    >
      <Paper elevation={0}
        sx={{
          width: '100%',
          height: '100%',
        }}
      >
        <Stack>
          {
            channelsList == undefined &&
            <LinearProgress
              sx={{
                m: 4,
              }} />
          }
          {
            channelsList !== undefined &&
            <>
              {
                channelsList.map((channel, i) => <ChannelElement key={i} index={i} liter={liter} name={channel} selectionState={selectedChannelIndex == i} setSelectedChannelIndex={setSelectedChannelIndex} setSelectedChannel={setSelectedChannel} setOpenMobMsg={setOpenMobMsg} />)
              }
            </>
          }
        </Stack>
      </Paper>
    </Grid>
  );
}


export default ChannelsList;