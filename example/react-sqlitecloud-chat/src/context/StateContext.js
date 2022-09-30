import React, { useState, createContext } from "react";

const StateContext = createContext({});

const StateProvider = ({ children }) => {

  return (
    <StateContext.Provider
      value={{}}
    >
      {children}
    </StateContext.Provider>
  )
}

export { StateContext, StateProvider }
