//core
import React, { Fragment, useEffect, useState, useContext } from "react";
//react-router
import { useSearchParams } from 'react-router-dom';
//mui
import Paper from '@mui/material/Paper';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');
//SqliteCloud context
import { StateContext } from "./context/StateContext"
//SqliteCloud componets
import SingleMessage from "./SingleMessage";
import MessageEditor from "./MessageEditor";

const Messages = ({ liter }) => {
  if (config.debug.renderingProcess) utils.logThis("Messages: ON RENDER");
  //react router hooks used to set query string
  const [searchParams, setSearchParams] = useSearchParams();

  //read from context state dedicated to save all received messages
  const { chsMap } = useContext(StateContext);
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    const queryChannel = searchParams.get("channel");
    if (queryChannel) {
      if (chsMap.get(queryChannel)) {
        setMessages(chsMap.get(queryChannel));
      }
    }
  }, [chsMap, searchParams])


  return (
    <Paper elevation={3}
      sx={{
        width: '100%',
        height: '100%',
        maxWidth: '437px',
      }}
    >
      {
        messages.map((msg, i) => {
          return (
            <SingleMessage key={i} msg={msg} />
          )
        })
      }
      <MessageEditor liter={liter} />
    </Paper>
  );
}


export default Messages;