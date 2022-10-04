//core
import React, { Fragment, useEffect, useState, useContext } from "react";
//react-router
import { useSearchParams } from 'react-router-dom';
//moment
const moment = require('moment');
//mui
import Card from '@mui/material/Card';
import { CardActionArea } from '@mui/material';
import CardHeader from '@mui/material/CardHeader';
import Avatar from '@mui/material/Avatar';
import { green } from '@mui/material/colors';
import Badge from '@mui/material/Badge';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');
//SqliteCloud context
import { StateContext } from "./context/StateContext"

const ChannelElement = ({ liter, index, name, selectionState, setSelectedChannel }) => {
  if (config.debug.renderingProcess) utils.logThis("ChannelElement: ON RENDER");
  //colors used to indicated if the channel is selected or no
  const accent = green[500];
  const white = "#FFF";

  //react router hooks used to set query string
  const [searchParams, setSearchParams] = useSearchParams();

  //read from context state dedicated to save all received messages
  const { chsMap, chsMapRef, setChsMap } = useContext(StateContext);
  const [prevMsgLenght, setPrevMsgLenght] = useState(0);
  const [alertNewMsg, setAlertNewMsg] = useState(0);


  //we need to create a refernce to context state since listen callback is called inside an event listern
  //see here https://medium.com/geographit/accessing-react-state-in-event-listeners-with-usestate-and-useref-hooks-8cceee73c559
  const listen = (message) => {
    if (message.channel == name) {
      let newChsMap = new Map(JSON.parse(JSON.stringify(Array.from(chsMapRef.current))));
      let newMessages = JSON.parse(JSON.stringify(newChsMap.get(name)));
      message.time = moment().format('MMMM Do YYYY, h:mm:ss a');
      newMessages.push(message);
      newChsMap.set(name, newMessages)
      chsMapRef.current = newChsMap;
      setChsMap(newChsMap);
    }
  }


  //when loading for the first time check if the actual query params is equal to channel name.
  //in this case set the selected channel equal to the channel index
  useEffect(() => {
    const registerToCh = async () => {
      const response = await liter.listen(name, listen);
    }
    registerToCh();
    const queryChannel = searchParams.get("channel");
    if (queryChannel == name) setSelectedChannel(index);
    let newChsMap = new Map(JSON.parse(JSON.stringify(Array.from(chsMapRef.current))));
    newChsMap.set(name, []);
    chsMapRef.current = newChsMap;
    setChsMap(newChsMap);
  }, [])


  useEffect(() => {
    if (!selectionState && chsMapRef.current.get(name).length !== prevMsgLenght) {
      setAlertNewMsg(chsMapRef.current.get(name).length - prevMsgLenght);
    } else {
      setAlertNewMsg(0);
      setPrevMsgLenght(chsMapRef.current.get(name).length);
    }
  }, [chsMapRef.current])


  return (
    <Card
      elevation={0}
      sx={{
        m: 1,
        backgroundColor: selectionState ? accent : white
      }}>
      <CardActionArea
        onClick={() => {
          setAlertNewMsg(0);
          setSelectedChannel(index);
          setSearchParams({ channel: name });
        }}
      >
        <CardHeader
          avatar={
            <Badge badgeContent={alertNewMsg} color="secondary">
              <Avatar
                aria-label="channel-name"
                sx={{
                  bgcolor: selectionState ? white : accent,
                  color: selectionState ? accent : white
                }}
              >
                {name.charAt(0).toUpperCase()}
              </Avatar>
            </Badge>
          }
          title={name}
          subheader="21:34"
        />
      </CardActionArea>
    </Card>
  );
}


export default ChannelElement;