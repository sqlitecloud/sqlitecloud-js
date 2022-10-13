//core
import React, { Fragment, useLayoutEffect, useRef } from "react";
//react-router
import { useSearchParams } from 'react-router-dom';
//mui
import Grid from '@mui/material/Unstable_Grid2';
import { green } from '@mui/material/colors';
//SqliteCloud
const config = require('./config').config;
import { logThis } from './utils'
//SqliteCloud context
import { StateContext } from "./context/StateContext"
//SqliteCloud componets
import SingleMessage from "./SingleMessage";
import MessageEditor from "./MessageEditor";


const MessagesPresentation = ({ messages, liter, showEditor }) => {
  if (config.debug.renderingProcess) logThis("MessagesPresentation: ON RENDER");

  const contRef = useRef(null);

  useLayoutEffect(() => {
    contRef.current.scrollTo(0, contRef.current.scrollHeight);
  }, [messages])

  return (
    <Grid
      container
      direction="column"
      justifyContent={"flex-end"}
      wrap="no-wrap"
      maxWidth={"lg"}
      sx={{
        flexGrow: 1,
        width: "100%",
        pb: 4,
        px: 2
      }}
    >
      <Grid
        container
        direction="column"
        wrap="no-wrap"
        ref={contRef}
        sx={{
          maxHeight: "calc(100vh - 140px)",
          overflowY: "auto"
        }}
      >
        {
          messages.map((msg, i) => {
            return (
              <SingleMessage key={i} msg={msg} showEditor={showEditor} />
            )
          })
        }
      </Grid>
      {
        showEditor &&
        <Grid>
          <MessageEditor liter={liter} />
        </Grid>
      }
    </Grid>
  );
}


export default MessagesPresentation;