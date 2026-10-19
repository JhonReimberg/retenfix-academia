const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('retenfix',Object.fromEntries(['content','candidate','start','answer','finish','history','report','catalogSearch','openCatalog','openSource','exportResults','backup','dataFolder'].map(name=>[name,(...args)=>ipcRenderer.invoke('retenfix:'+name,...args)])));
