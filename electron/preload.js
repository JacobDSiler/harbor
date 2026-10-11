// Nothing is exposed to the page on purpose (Harbor is a plain web app). Marks the shell so the app can tell, if it ever needs to.
const { contextBridge } = require("electron");
contextBridge.exposeInMainWorld("HarborDesktop", { platform: process.platform, version: "1.0.0" });
