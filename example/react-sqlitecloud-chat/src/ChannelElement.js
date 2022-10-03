//core
import React, { Fragment, useEffect, useState, useContext } from "react";
//react-router
import { useSearchParams } from 'react-router-dom';
//mui
import Card from '@mui/material/Card';
import { CardActionArea } from '@mui/material';
import CardHeader from '@mui/material/CardHeader';
import Avatar from '@mui/material/Avatar';
import { green } from '@mui/material/colors';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');
//SqliteCloud context
import { StateContext } from "./context/StateContext"

const ChannelElement = ({ liter, index, name, selectionState, setSelectedChannel }) => {
  if (config.debug.renderingProcess) utils.logThis("ChannelElement: ON RENDER");


  //colors used to indicated if the channel is selected or no
  const accent = green[500]; // #f44336
  const white = "#FFF";

  //react router hooks used to set query string
  const [searchParams, setSearchParams] = useSearchParams();

  //when loading for the first time check if the actual query params is equal to channel name.
  //in this case set the selected channel equal to the channel index
  useEffect(() => {
    const queryChannel = searchParams.get("channel");
    if (queryChannel == name) setSelectedChannel(index);
  }, [])

  //read from context state dedicated to save all received messages
  const { msgQueue, setMsgQueue } = useContext(StateContext);
  const [message, setMessage] = useState("");
  const listen = (message) => {
    setMessage(message.payload);
  }

  useEffect(() => {
    msgQueue.push(message);
    console.log(msgQueue)
  }, [message])

  //Based on selectionState value channel listeing in started or stopped
  useEffect(() => {
    const registerToCh = async () => {
      const response = await liter.listen(name, listen);
      console.log(response);
    }
    const unRegisterToCh = async () => {
      const response = await liter.unlisten(name);
      console.log(response);
    }

    if (selectionState) {
      registerToCh();
    }

    if (!selectionState) {
      unRegisterToCh();
    }

  }, [selectionState])

  return (
    <Card
      elevation={0}
      sx={{
        m: 1,
        backgroundColor: selectionState ? accent : white
      }}>
      <CardActionArea
        onClick={() => {
          setSelectedChannel(index);
          setSearchParams({ channel: name });
        }}
      >
        <CardHeader
          avatar={
            <Avatar
              aria-label="channel-name"
              sx={{
                bgcolor: selectionState ? white : accent,
                color: selectionState ? accent : white
              }}
            >
              {name.charAt(0).toUpperCase()}
            </Avatar>
          }
          title={name}
          subheader="21:34"
        />
      </CardActionArea>
    </Card>
  );
}


export default ChannelElement;