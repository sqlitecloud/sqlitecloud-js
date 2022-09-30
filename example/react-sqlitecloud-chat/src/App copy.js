//core
import React, { Fragment, useEffect, useState } from "react";
//css
import "./style.css";
//mui
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));
//sqlitecloud
const config = require('./config').config;
const utils = require('./utils');
import { StateProvider } from './context/StateContext';

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
  let myLiter = new Liter(projectId, apikey, onErrorCallback, onCloseCallback);

  useEffect(() => {
    const onMountWrapper = async () => {
      if (config.debug.renderingProcess) utils.logThis("App: ON useEffect");
      const connectionResponse = await myLiter.connect();
      if (config.debug.renderingProcess) utils.logThis(connectionResponse.message);
      if (connectionResponse.status == "success") {
        setConnectionResponse(connectionResponse);
        // const channelsListResponse = await myLiter.exec("LIST DATABASES");
        const channelsListResponse = await myLiter.exec("LIST CHANNELS");
        console.log(channelsListResponse)
        if (channelsListResponse.status == "success") {
          if (config.debug.renderingProcess) utils.logThis("Received channels list");
          setChannelsList(channelsListResponse.data);
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
        <Box sx={{ flexGrow: 1 }}>
          {
            connectionResponse.status == undefined &&
            <Box sx={{ width: '100%' }}>
              <LinearProgress />
            </Box>
          }
          {
            connectionResponse.status == "success" &&
            <>
              <Stack sx={{ width: '100%' }} spacing={2}>
                <Alert severity="success">{connectionResponse.message}</Alert>
              </Stack>
              {
                channelsList !== undefined &&
                <Box sx={{ width: '100%' }}>
                  <Stack spacing={2}>
                    {
                      channelsList.columns.map((channel, i) => <Item key={i}>{channel}</Item>)
                    }
                  </Stack>
                </Box>
              }
            </>
          }
          {
            connectionResponse.status == "error" &&
            <Stack sx={{ width: '100%' }} spacing={2}>
              <Alert severity="error">{connectionResponse.message}</Alert>
            </Stack>
          }
        </Box>
      </StateProvider>
    </Fragment>
  );
}


export default App;