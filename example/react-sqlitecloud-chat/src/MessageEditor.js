//core
import React, { useState } from "react";
//react-router
import { useSearchParams } from 'react-router-dom';
//mui
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import SendIcon from '@mui/icons-material/Send';
//SqliteCloud
const config = require('./config').config;
const utils = require('./utils');
//SqliteCloud context

const MessageEditor = ({ liter }) => {
  if (config.debug.renderingProcess) utils.logThis("MessageEditor: ON RENDER");

  const [value, setValue] = useState("");
  const handleChange = (event) => {
    setValue(event.target.value);
  };

  //react router hooks used to set query string
  const [searchParams, setSearchParams] = useSearchParams();

  const sendMsg = async () => {
    const queryChannel = searchParams.get("channel");
    if (queryChannel) {
      const response = await liter.notify(queryChannel, value);
      if (response.status == "success") {
        setValue("");
      }
    }
  }


  return (
    <Box
      component="form"
      sx={{
        '& .MuiTextField-root': { m: 1, width: '25ch' },
      }}
      noValidate
      autoComplete="off"
    >
      <Stack direction="column" spacing={2}>
        <TextField
          id="message-editor"
          label="Your message"
          placeholder=""
          multiline
          maxRows={4}
          value={value}
          onChange={handleChange}
        />
        <Button
          onClick={sendMsg}
          variant="contained"
          endIcon={<SendIcon />}
        >
          Send
        </Button>
      </Stack>
    </Box>
  );
}


export default MessageEditor;