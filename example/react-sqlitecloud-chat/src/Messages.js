//core
import React, { useContext } from "react";
//mui
import Grid from '@mui/material/Unstable_Grid2';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');
//SqliteCloud context
import { StateContext } from "./context/StateContext"
//SqliteCloud componets
import MessagesBar from "./MessagesBar";
import MessagesPresentation from "./MessagesPresentation";

const Messages = ({ liter, selectedChannel, show, showEditor }) => {
  if (config.debug.renderingProcess) utils.logThis("Messages: ON RENDER");
  //read from context all channels registered  
  const { chsMap } = useContext(StateContext);
  return (
    <>
      {
        show && chsMap.size > 0 &&
        <Grid
          position="relative"
          container
          direction={"column"}
          justifyContent={"flex-end"}
          alignItems={"center"}
          wrap="no-wrap"
          sx={{
            flexGrow: 1,
            height: "100%",
          }}
        >
          <MessagesBar channel={selectedChannel} />
          <MessagesPresentation messages={chsMap.get(selectedChannel)} liter={liter} showEditor={showEditor} />
        </Grid>
      }
    </>
  );
}


export default Messages;