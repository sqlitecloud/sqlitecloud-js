//core
import React from "react";
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from "./App.js";
//sqlitecloud
const config = require('./config').config;

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(
  <BrowserRouter>
    {/* here we have the declaration of the avaible routes */}
    <Routes>
      <Route path="/" element={<App />}>
        <Route
          path={config.routes.prefix}
          element={<Navigate to="/" replace />}
        />
      </Route>
    </Routes>
  </BrowserRouter >
);