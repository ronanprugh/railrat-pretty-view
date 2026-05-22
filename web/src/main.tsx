import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import RoutesList from "./pages/RoutesList";
import RouteDetail from "./pages/RouteDetail";
import TrainsList from "./pages/TrainsList";
import TrainDetail from "./pages/TrainDetail";
import StationsList from "./pages/StationsList";
import StationDetail from "./pages/StationDetail";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<RoutesList />} />
          <Route path="routes/:slug" element={<RouteDetail />} />
          <Route path="trains" element={<TrainsList />} />
          <Route path="trains/:num" element={<TrainDetail />} />
          <Route path="stations" element={<StationsList />} />
          <Route path="stations/:code" element={<StationDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
