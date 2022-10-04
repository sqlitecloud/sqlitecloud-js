//core
import React, { Fragment, useEffect, useRef, useContext } from "react";
//react-router
import { useSearchParams } from 'react-router-dom';
//mui
import Card from '@mui/material/Card';
import { CardActionArea } from '@mui/material';
import CardHeader from '@mui/material/CardHeader';
import Avatar from '@mui/material/Avatar';
import { green, red, blue } from '@mui/material/colors';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');
//SqliteCloud context

const SingleMessage = ({ msg }) => {
  if (config.debug.renderingProcess) utils.logThis("SingleMessage: ON RENDER");
  //colors used to indicated if the channel is selected or no
  const accent = green[500]; // #f44336
  const me = blue[500]; // #f44336
  const other = red[500]; // #f44336
  const white = "#FFF";


  return (
    <Card
      elevation={0}
      sx={{
        m: 1,
        backgroundColor: msg.ownMessage ? me : other,
      }}>
      <CardHeader
        avatar={
          <Avatar
            aria-label="channel-name"
            sx={{
              bgcolor: white,
              color: accent
            }}
          >
            {msg.sender.charAt(0).toUpperCase()}
          </Avatar>
        }
        subheader={
          <div>
            <span>User: {msg.sender}</span>
            <br />
            <span>{msg.time}</span>
          </div>
        }
        title={msg.payload}
      />
    </Card>
  );
}


export default SingleMessage;