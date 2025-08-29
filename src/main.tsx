
/*import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './ui/App'
const root = createRoot(document.getElementById('root')!)
root.render(React.createElement(App))*/

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const el = document.getElementById("root");
if (!el) throw new Error("Missing #root in index.html");
createRoot(el).render(<App />);