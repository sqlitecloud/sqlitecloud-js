//core
import React, { Fragment, useEffect, useState } from "react";
//css
import "./style.css";
//react-router
import { useSearchParams } from 'react-router-dom';
//mui
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
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
  //credentials to establish the websocket connection
  var projectId = config.credential.projectId;
  var apikey = config.credential.apikey;

  //state dedicated to Liter instance used to handle websocket connection
  const [liter, setLiter] = useState(null);
  const [connectionResponse, setConnectionResponse] = useState(null);
  const [channelsListResponse, setChannelsListResponse] = useState(null);
  //callback function passet to websocket and register on error and close events
  let onErrorCallback = function (event, msg) {
    console.log(msg);
  }
  let onCloseCallback = function (msg) {
    console.log(msg);
  }

  //react router hooks used to set & get query string
  const [searchParams, setSearchParams] = useSearchParams();
  //if present, this is the database whose tables you want to register to
  const queryDBName = searchParams.get("dbName");
  //if present, this is the channel you want to listen to 
  const queryChannel = searchParams.get("channel");
  const [selectedChannel, setSelectedChannel] = useState(queryChannel);
  //state used to store the available available channels. In case queryDBName !== null available channels are db tables
  const [channelsList, setChannelsList] = useState(undefined);
  //based on value of query channel show or not Messages component
  const [showMessages, setShowMessages] = useState(false);
  //show message editor based on query paramters
  const [showEditor, setShowEditor] = useState(false);


  const checkChannelExist = (channelsList, channelName) => {
    if (channelsList) {
      let channelsMap = new Map();
      channelsList.forEach((ch, i) => {
        channelsMap.set(ch, i);
      })
      return channelsMap.has(channelName);
    } else {
      return false;
    }
  }

  useEffect(() => {
    const onMountWrapper = async () => {
      if (config.debug.renderingProcess) utils.logThis("App: ON useEffect");
      //init Liter instance using provided credentials
      let locaLiter = new Liter(projectId, apikey, onErrorCallback, onCloseCallback);
      //try to enstablish websocket connection
      const connectionResponse = await locaLiter.connect();
      setConnectionResponse(connectionResponse);
      if (config.debug.renderingProcess) utils.logThis(connectionResponse.message);
      if (connectionResponse.status == "success") {
        setLiter(locaLiter)
        //based on query parameters select if retrieve tabales db or channels
        //in case of db, tables will be saved as channels
        let channelsListResponse = null;
        if (queryDBName !== null) {
          const execMessage = `USE DATABASE ${queryDBName}; LIST TABLES PUBSUB`
          channelsListResponse = await locaLiter.exec(execMessage);
        } else {
          channelsListResponse = await locaLiter.exec("LIST CHANNELS");
        }
        setChannelsListResponse(channelsListResponse);
        if (channelsListResponse.status == "success") {
          if (config.debug.renderingProcess) utils.logThis("Received channels list");
          var channels = [];
          if (queryDBName !== null) {
            channelsListResponse.data.rows.forEach(c => {
              channels.push(c.chname);
            })
            setChannelsList(channels);
            setShowEditor(false);
          } else {
            if (channelsListResponse.data.rows == undefined) {
              channels = [
                "chname0",
                "chname1",
                "chname2",
                "chname3",
                "chname4",
              ];
              setChannelsList(channels);
            } else {
              channelsListResponse.data.rows.forEach(c => {
                channels.push(c.chname);
              })
              setChannelsList(channels);
            }
            setShowEditor(true);
          }
          //check if the channel in query string exist
          const testChannelExist = checkChannelExist(channels, queryChannel);
          //convert channelsList array into Map
          if (testChannelExist) {
            //if true show message components
            setShowMessages(true);
          } else {
            //if false not show message components and remove query string from url
            if (queryDBName !== null) {
              setSearchParams({
                dbName: queryDBName
              });
            } else {
              setSearchParams({});
            }
            setShowMessages(false);
          }
        } else {
          if (config.debug.renderingProcess) utils.logThis(channelsListResponse.data.message);
        }
      } else {
        if (config.debug.renderingProcess) utils.logThis(connectionResponse.data.message);
      }
    }
    onMountWrapper();
  }, []);


  useEffect(() => {
    setShowMessages(checkChannelExist(channelsList, selectedChannel));
  }, [selectedChannel])

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
            {
              connectionResponse && connectionResponse.status == "error" &&
              <Stack sx={{ width: '100%' }} spacing={2}>
                <Alert severity="error">{connectionResponse.data.message}</Alert>
              </Stack>
            }
            {
              channelsListResponse && channelsListResponse.status == "error" &&
              <Stack sx={{ width: '100%' }} spacing={2}>
                <Alert severity="error">{channelsListResponse.data.message}</Alert>
              </Stack>
            }
            <ChannelsList liter={liter} channelsList={channelsList} setSelectedChannel={setSelectedChannel} />
            <Messages liter={liter} show={showMessages} showEditor={showEditor} selectedChannel={selectedChannel} />
          </Grid>
        </Box>
      </StateProvider>
    </Fragment>
  );
}


export default App;