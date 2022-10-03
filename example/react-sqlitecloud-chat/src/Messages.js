//core
import React, { Fragment, useEffect, useState, useContext } from "react";
//mui
import LinearProgress from '@mui/material/LinearProgress';
import Grid from '@mui/material/Unstable_Grid2';
import Paper from '@mui/material/Paper';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');
//SqliteCloud context
import { StateContext } from "./context/StateContext"

const Messages = () => {
  if (config.debug.renderingProcess) utils.logThis("Messages: ON RENDER");
  //read from context state dedicated to save all received messages
  const { msgQueue } = useContext(StateContext);
  const [lastMsg, setLastMsg] = useState("");

  console.log("msgQueue");
  useEffect(() => {
    // if (msgQueue) {
    //   console.log("HEERE")
    //   setLastMsg(msgQueue.shift());
    // }
  }, [msgQueue])

  return (
    <Paper elevation={3}
      sx={{
        width: '100%',
        height: '100%',
        maxWidth: '437px',
      }}
    >
      {lastMsg}
    </Paper>
  );
}


export default Messages;