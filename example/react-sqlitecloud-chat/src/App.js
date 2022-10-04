//core
import React, { Fragment, useEffect, useState } from "react";
//css
import "./style.css";
//mui
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');
import { StateProvider } from './context/StateContext';
//SqliteCloud components
import ChannelsList from "./ChannelsList"
import Messages from "./Messages"

//Liter
import { Liter } from "js-sdk"

const App = () => {
  if (config.debug.renderingProcess) utils.logThis("App: ON RENDER");

  const [connectionResponse, setConnectionResponse] = useState({ status: undefined, message: "" });
  const [channelsList, setChannelsList] = useState(undefined);
  var projectId = config.credential.projectId;
  var apikey = config.credential.apikey;

  let onErrorCallback = function (event, msg) {
    console.log(msg);
  }

  let onCloseCallback = function (msg) {
    console.log(msg);
  }

  const [liter, setLiter] = useState(null);


  useEffect(() => {
    const onMountWrapper = async () => {
      let locaLiter = new Liter(projectId, apikey, onErrorCallback, onCloseCallback);
      if (config.debug.renderingProcess) utils.logThis("App: ON useEffect");
      const connectionResponse = await locaLiter.connect();
      if (config.debug.renderingProcess) utils.logThis(connectionResponse.message);
      if (connectionResponse.status == "success") {
        setLiter(locaLiter)
        setConnectionResponse(connectionResponse);
        const channelsListResponse = await locaLiter.exec("LIST CHANNELS");
        if (channelsListResponse.status == "success") {
          if (config.debug.renderingProcess) utils.logThis("Received channels list");
          // setChannelsList(channelsListResponse.data.columns);
          setChannelsList([
            "chname0",
            "chname1",
            "chname2",
            "chname3",
          ]);
        } else {
          if (config.debug.renderingProcess) utils.logThis("Error receiving database list");
        }
      } else {
        setConnectionResponse(connectionResponse);
      }
    }
    onMountWrapper();

    return () => {
    }

  }, []);


  return (
    <Fragment>
      <CssBaseline />
      <StateProvider>
        <Box sx={{
          height: "100%",
          flexGrow: 1,
        }}>
          <Grid
            container
            spacing={0}
            sx={{ height: "100%" }}
          >
            <ChannelsList liter={liter} channelsList={channelsList} />
            <Messages liter={liter} channelsList={channelsList} />
          </Grid>
        </Box>
      </StateProvider>
    </Fragment>
  );
}


export default App;