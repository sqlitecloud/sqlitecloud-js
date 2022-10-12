//core
import React, { useContext } from "react";
//mui
import Grid from '@mui/material/Unstable_Grid2';
import Drawer from '@mui/material/Drawer';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');
//SqliteCloud context
import { StateContext } from "./context/StateContext"
//SqliteCloud componets
import MessagesBar from "./MessagesBar";
import MessagesPresentation from "./MessagesPresentation";

const Messages = ({ liter, selectedChannel, show, showEditor, openMobMsg, setOpenMobMsg }) => {
  if (config.debug.renderingProcess) utils.logThis("Messages: ON RENDER");
  //read from context all channels registered  
  const { chsMap } = useContext(StateContext);
  return (
    <>
      {
        show && chsMap.size > 0 &&
        <>
          <Grid
            position="relative"
            container
            direction={"column"}
            justifyContent={"flex-end"}
            alignItems={"center"}
            wrap="no-wrap"
            sx={{
              display: { xs: "none", sm: "flex" },
              flexGrow: 1,
              height: "100%",
            }}
          >
            <MessagesBar channel={selectedChannel} setOpenMobMsg={setOpenMobMsg} />
            <MessagesPresentation messages={chsMap.get(selectedChannel)} liter={liter} showEditor={showEditor} />
          </Grid>
          <Drawer
            sx={{
              width: "100%",
              display: { xs: "block", sm: "none" },
            }}
            anchor={'right'}
            PaperProps={{
              sx: {
                width: "100%",
              }
            }}
            open={openMobMsg}
            onClose={() => { setOpenMobMsg(false) }}
          >
            <MessagesBar channel={selectedChannel} setOpenMobMsg={setOpenMobMsg} />
            <MessagesPresentation messages={chsMap.get(selectedChannel)} liter={liter} showEditor={showEditor} />
          </Drawer>
        </>
      }
    </>
  );
}


export default Messages;