//core
import React, { Fragment, useEffect, useState, useContext } from "react";
//react-router
import { useSearchParams } from 'react-router-dom';
//date-fns
import { format } from 'date-fns';
//mui
import { styled } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import { CardActionArea } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import { green } from '@mui/material/colors';
//SqliteCloud
import { logThis } from './utils';
//SqliteCloud context
import { StateContext } from "./context/StateContext"


const SuccessBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""'
    }
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

const ErrorBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    color: `${theme.palette.error.main}`,
    background: `${theme.palette.error.main}`,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      border: '1px solid currentColor',
      content: '""',
    },
  }
}));


const ChannelElement = ({ liter, index, name, selectionState, setSelectedChannel, setSelectedChannelIndex, setOpenMobMsg }) => {
  if (process.env.DEBUG == "true") logThis("ChannelElement: ON RENDER");
  //colors used to indicated if the channel is selected or no
  const accent = green[500];
  const white = "#FFF";

  //react router hooks used to set query string
  const [searchParams, setSearchParams] = useSearchParams();
  //if present, this is the database whose tables you want to register to
  const queryDBName = searchParams.get("dbName");

  //this state store the listen command result
  const [listenResponse, setListenResponse] = useState(null);
  //timestamp last message
  const [msgTimestamp, setMsgTimestamp] = useState("");

  //read from context state dedicated to save all received messages
  const { chsMapRef, setChsMap } = useContext(StateContext);
  const [prevMsgLenght, setPrevMsgLenght] = useState(0);
  const [alertNewMsg, setAlertNewMsg] = useState(0);


  //we need to create a reference to context state since the listen callback is called inside an event listener
  //see here https://medium.com/geographit/accessing-react-state-in-event-listeners-with-usestate-and-useref-hooks-8cceee73c559
  //whene a new message arrives it is added in the chsMap in correspondence of the element which has the channel name as its key
  const listen = (message) => {
    if (message.channel == name) {
      console.log(message) //TOGLIMI
      let newChsMap = new Map(JSON.parse(JSON.stringify(Array.from(chsMapRef.current))));
      let newMessages = JSON.parse(JSON.stringify(newChsMap.get(name)));
      message.time = format(new Date(), "yyyy-MM-dd' | 'HH:mm:ss")
      setMsgTimestamp(message.time);
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
      setListenResponse(response);
    }
    registerToCh();
    const queryChannel = searchParams.get("channel");
    if (queryChannel == name) setSelectedChannelIndex(index);
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


  const updateSelectChannel = () => {
    setAlertNewMsg(0);
    setSelectedChannelIndex(index);
    setSelectedChannel(name);
    if (queryDBName !== null) {
      setSearchParams({
        dbName: queryDBName,
        channel: name,
      });
    } else {
      setSearchParams({
        channel: name
      });
    }
    setOpenMobMsg(true);
  }

  return (
    <Card
      elevation={0}
      sx={{
        m: 1,
        backgroundColor: selectionState ? accent : white
      }}>
      <CardActionArea onClick={updateSelectChannel} disabled={!listenResponse}>
        {
          !listenResponse &&
          <CardHeader
            avatar={
              <CircularProgress />
            }
            title={name}
            subheader={"Connecting..."}
          />
        }
        {
          listenResponse && listenResponse.status == "error" &&
          <CardHeader
            avatar={
              <ErrorBadge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                variant="dot"
              >
                <Avatar
                  aria-label="channel-name"
                  sx={{
                    bgcolor: selectionState ? white : accent,
                    color: selectionState ? accent : white
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </Avatar>
              </ErrorBadge>
            }
            title={name}
            subheader={listenResponse.data.message}
          />
        }
        {
          listenResponse && listenResponse.status == "success" &&
          <CardHeader
            avatar={
              <Badge badgeContent={alertNewMsg} color="primary"
                overlap="circular"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <SuccessBadge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                >
                  <Avatar
                    aria-label="channel-name"
                    sx={{
                      bgcolor: selectionState ? white : accent,
                      color: selectionState ? accent : white
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </Avatar>
                </SuccessBadge>
              </Badge>
            }
            title={name}
            subheader={msgTimestamp}
          />
        }
      </CardActionArea>
    </Card >
  );
}


export default ChannelElement;