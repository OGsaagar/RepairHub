import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import { AppProviders } from "./app/providers";
import { router } from "./app/router";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>,
);
