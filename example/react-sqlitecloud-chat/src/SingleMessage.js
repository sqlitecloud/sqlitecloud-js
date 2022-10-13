//core
import React, { Fragment, useEffect, useRef, useContext } from "react";
//react-json-view
import ReactJson from "react-json-view"
//mui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import { green, red, blue, cyan, teal } from '@mui/material/colors';
//SqliteCloud
const config = require('./config').config;
import { logThis } from './utils'
//SqliteCloud context

function NewlineText({ text }) {
  let newText = "";
  if (text !== null) {
    console.log(text.split('\n'))
    newText = text.split('\n').map((str, i) => {
      if (str == "") {
        return (
          <br key={i} />
        )
      } else {
        return (
          <Typography variant="body1" component="div" key={i}>{str}</Typography>
        )
      }
    });
    return newText;
  }
}

const SingleMessage = ({ msg, showEditor }) => {
  if (config.debug.renderingProcess) logThis("SingleMessage: ON RENDER");
  //colors used to indicated if the channel is selected or no
  const accent = green[500];
  const me = cyan[100];
  const other = teal[100];
  const white = "#FFF";


  return (
    <Box
      maxWidth={"sm"}
      sx={{
        flexGrow: 1,
        alignSelf: msg.ownMessage ? "self-end" : "self-start",
      }}
    >
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
          title={
            <Box>
              {
                showEditor &&
                <NewlineText text={msg.payload.message} />
              }
              {
                !showEditor &&
                <Box>
                  <ReactJson src={msg.payload} theme="monokai" />
                </Box>
              }
              <Divider sx={{
                mt: 1,
                mb: 2
              }} />
            </Box>
          }
        />
      </Card>
    </Box>
  );
}


export default SingleMessage;