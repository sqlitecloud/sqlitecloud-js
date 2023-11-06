//core
import React, { useContext } from "react";
//mui
import Grid from '@mui/material/Unstable_Grid2';
import Drawer from '@mui/material/Drawer';
//SqliteCloud
import { logThis } from './utils';
//SqliteCloud context
import { StateContext } from "./context/StateContext"
//SqliteCloud componets
import MessagesBar from "./MessagesBar";
import MessagesPresentation from "./MessagesPresentation";

const Messages = ({ liter, selectedChannel, show, showEditor, openMobMsg, setOpenMobMsg, setSelectedChannel, setSelectedChannelIndex }) => {
  if (process.env.DEBUG == "true") logThis("Messages: ON RENDER");
  //read from context all channels registered  
  const { chsMap } = useContext(StateContext);

  const toggleDrawer = (anchor, open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setOpenMobMsg(false)
  };

  return (
    <>
      {
        show && selectedChannel && chsMap.size > 0 &&
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
            <MessagesBar channel={selectedChannel} setOpenMobMsg={setOpenMobMsg} setSelectedChannel={setSelectedChannel} setSelectedChannelIndex={setSelectedChannelIndex} />
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
            onClose={toggleDrawer}
          >
            <MessagesBar channel={selectedChannel} setOpenMobMsg={setOpenMobMsg} setSelectedChannel={setSelectedChannel} setSelectedChannelIndex={setSelectedChannelIndex} />
            <MessagesPresentation messages={chsMap.get(selectedChannel)} liter={liter} showEditor={showEditor} />
          </Drawer>
        </>
      }
    </>
  );
}


export default Messages;