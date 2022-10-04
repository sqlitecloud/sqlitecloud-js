//core
import React, { Fragment, useLayoutEffect, useRef } from "react";
//react-router
import { useSearchParams } from 'react-router-dom';
//mui
import Grid from '@mui/material/Unstable_Grid2';
import { green } from '@mui/material/colors';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');
//SqliteCloud context
import { StateContext } from "./context/StateContext"
//SqliteCloud componets
import SingleMessage from "./SingleMessage";
import MessageEditor from "./MessageEditor";


const MessagesPresentation = ({ messages, liter }) => {
  if (config.debug.renderingProcess) utils.logThis("MessagesPresentation: ON RENDER");

  const contRef = useRef(null);

  useLayoutEffect(() => {
    console.log("vfdsafdsa")
    console.log(contRef.current)
    contRef.current.scrollTo(0, contRef.current.scrollHeight);
  }, [messages])

  return (
    <Grid
      container
      direction="column"
      justifyContent={"flex-end"}
      wrap="no-wrap"
      xs={6}
      sx={{
        flexGrow: 1,
        pb: 8
      }}
    >
      <Grid
        ref={contRef}
        sx={{
          maxHeight: "calc(100vh - 255px)",
          overflowY: "scroll"
        }}
      >
        {
          messages.map((msg, i) => {
            return (
              <SingleMessage key={i} msg={msg} />
            )
          })
        }
      </Grid>
      <Grid>
        <MessageEditor liter={liter} />
      </Grid>
    </Grid>
  );
}


export default MessagesPresentation;