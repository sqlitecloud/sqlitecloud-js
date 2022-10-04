//core
import React, { Fragment, useEffect, useState, useContext } from "react";
//react-router
import { useSearchParams } from 'react-router-dom';
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

const Messages = ({ liter, channelsList }) => {
  if (config.debug.renderingProcess) utils.logThis("Messages: ON RENDER");
  //read from context all channels registered  
  const { chsMap } = useContext(StateContext);
  //react router hooks used to set and get query string
  const [searchParams, setSearchParams] = useSearchParams();
  //get actual setted channel in query string
  const queryChannel = searchParams.get("channel");
  //if the channel setted in query string is present in chsMap this variable will be setted to true
  const [show, setShow] = useState(false);

  useEffect(() => {
    //if channel list has been received from backend start the checks
    if (channelsList) {
      //convert channelsList array into Map
      let channelsMap = new Map();
      channelsList.forEach((ch, i) => {
        channelsMap.set(ch, i);
      })
      //check if the channel in query string exist
      if (channelsMap.has(queryChannel)) {
        //if true show message components
        setShow(true);
      } else {
        //if false not show message components and remove query string from url
        setSearchParams({});
        setShow(false);
      }
    }
  }, [channelsList, queryChannel])


  return (
    <>
      {
        show &&
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
          <MessagesBar channel={queryChannel} />
          <MessagesPresentation messages={chsMap.get(queryChannel)} liter={liter} />
        </Grid>
      }
    </>
  );
}


export default Messages;