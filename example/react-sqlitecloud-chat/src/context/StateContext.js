import React, { useState, createContext } from "react";

const StateContext = createContext({});

const StateProvider = ({ children }) => {

  //
  const [msgQueue, setMsgQueue] = useState([]);
  console.log(msgQueue)
  return (
    <StateContext.Provider
      value={{
        msgQueue, setMsgQueue
      }}
    >
      {children}
    </StateContext.Provider>
  )
}

export { StateContext, StateProvider }
