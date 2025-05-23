import React, { Component } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./portions/NavBar";
import Footer from "./portions/Footer";

import MetaLinks from "./components/MetaLinks";

import MainPage from "./pages/MainPage";
import NotFound from "./pages/NotFound";
import ApiDocs from "./pages/ApiDocs";
import Contact from "./pages/Contact";
import TOS from "./pages/TOS";
import Privacy from "./pages/Privacy";
import ClosePage from "./pages/ClosePage";
import DownloadLauncher from "./pages/DownloadLauncher";

export default class extends Component {
  render(): React.ReactNode {
    return (
      <Router>
        <div>
          <MetaLinks />
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<MainPage />}/>
              <Route path="/api-docs" element={<ApiDocs />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/tos" element={<TOS />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/close" element={<ClosePage />} />
              <Route path="/download-launcher" element={<DownloadLauncher />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    );
  }
}