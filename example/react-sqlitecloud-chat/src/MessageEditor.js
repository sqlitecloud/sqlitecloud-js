//core
import React, { useEffect, useState, useRef } from "react";
//react-router
import { useSearchParams } from 'react-router-dom';
//mui
import SendIcon from '@mui/icons-material/Send';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
//SqliteCloud
import { config } from './config';
import { logThis } from './utils';
//SqliteCloud context

const MessageEditor = ({ liter }) => {
  if (config.debug.renderingProcess) logThis("MessageEditor: ON RENDER");

  const editorRef = useRef(null)
  const formRef = useRef(null)

  const [value, setValue] = useState("");
  const handleChange = (event) => {
    setValue(event.target.value);
  };

  const handleKey = (event) => {
    if (event.keyCode == 13 && event.shiftKey) {
    } else if (event.keyCode == 13) {
      event.preventDefault();
      if (value !== "") sendMsg();
      return false;
    }
  };

  //react router hooks used to set query string
  const [searchParams, setSearchParams] = useSearchParams();

  const sendMsg = async (event) => {
    if (event) event.preventDefault();
    const queryChannel = searchParams.get("channel");
    if (queryChannel) {
      const response = await liter.notify(queryChannel, { message: value });
      if (response.status == "success") {
        setValue("");
        editorRef.current.focus();
      }
    }
  }

  useEffect(() => {
    setValue("");
    editorRef.current.focus();
  }, [searchParams])

  return (
    <Paper
      ref={formRef}
      component="form"
      onSubmit={sendMsg}
      sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: '100%' }}
    >
      <InputBase
        inputRef={editorRef}
        sx={{ ml: 1, flex: 1 }}
        placeholder="Your message"
        inputProps={{ 'aria-label': 'Your message' }}
        fullWidth
        autoFocus={true}
        multiline={true}
        onChange={handleChange}
        value={value}
        onKeyDown={handleKey}
      />
      <IconButton disabled={value == ""} type="submit" color="primary" sx={{ p: '10px', alignSelf: "end" }} aria-label="directions">
        <SendIcon />
      </IconButton>
    </Paper>
  );
}


export default MessageEditor;