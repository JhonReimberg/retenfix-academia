const {app,BrowserWindow,ipcMain,shell,dialog,session,nativeImage}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {Store}=require('./store.cjs');
const {normalize,csvCell,candidate}=require('./core.cjs');
const content=require('./content.cjs');
const sources=require('./data/sources.json');
const catalogIndex=require('./data/catalog-index.json');
if(process.env.RETENFIX_TEST_DATA) app.setPath('userData',process.env.RETENFIX_TEST_DATA);
app.setName('Retenfix Academia');
let store,win;
const indexURL=pathToFileURL(path.join(__dirname,'index.html')).href;
const catalogRoot=()=>app.isPackaged?path.join(process.resourcesPath,'catalogos'):path.join(__dirname,'..','resources','catalogos');
function register(name,handler){ipcMain.handle('retenfix:'+name,async(event,...args)=>{
  if(event.senderFrame?.url.split('#')[0]!==indexURL) throw new Error('Origem não autorizada.');
  return handler(...args);
});}
app.whenReady().then(()=>{
  fs.mkdirSync(app.getPath('userData'),{recursive:true});
  store=new Store(path.join(app.getPath('userData'),'treinamento.sqlite'),content.questions);
  session.defaultSession.setPermissionRequestHandler((wc,permission,callback)=>callback(false));
  register('content',()=>({families:content.families,lessons:content.lessons,sources,questionCount:content.questions.length,pageCount:catalogIndex.reduce((n,c)=>n+c.pages,0)}));
  register('candidate',input=>candidate(input));
  register('start',(name,track)=>store.start(name,track));
  register('answer',(id,qid,choice)=>store.answer(id,qid,choice));
  register('finish',id=>store.finish(id));
  register('history',()=>store.history());
  register('report',id=>store.report(id));
  register('catalogSearch',(query,sourceId)=>{
    const terms=normalize(query).split(/\s+/).filter(Boolean).slice(0,8);
    if (!terms.length) return {total:0,results:[]};
    const hits=[];
    for(const cat of catalogIndex){
      const source=sources.find(s=>s.file===cat.file);
      if(!source || (sourceId && source.id!==sourceId))continue;
      for(const p of cat.content){
        const txt=normalize(p.text);
        if(terms.every(t=>txt.includes(t))){
          const pos=txt.indexOf(terms[0]);
          hits.push({sourceId:source.id,title:source.title,page:p.page,snippet:p.text.slice(Math.max(0,pos-100),pos+360).replace(/\s+/g,' ')});
        }
      }
    }
    return {total:hits.length,results:hits.slice(0,100)};
  });
  register('openCatalog',async(id,page=1)=>{
    const source=sources.find(s=>s.id===id);if(!source)throw new Error('Catálogo não encontrado.');
    const file=path.join(catalogRoot(),source.file);
    if(!fs.existsSync(file))throw new Error('Arquivo indisponível.');
    if(!file.endsWith('.pdf')){const error=await shell.openPath(file);if(error)throw new Error(error);return true;}
    const pdf=new BrowserWindow({width:1150,height:850,parent:win,show:!process.argv.includes('--hidden'),title:source.title,autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
    pdf.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    pdf.webContents.on('will-navigate',e=>e.preventDefault());
    await pdf.loadFile(file,{hash:'page='+Math.max(1,Math.min(source.pages||1,Number(page)||1))});
    return true;
  });
  register('openSource',id=>{const source=sources.find(s=>s.id===id);if(!source)throw new Error('Fonte não encontrada.');return shell.openExternal(source.url);});
  register('exportResults',async()=>{
    const {filePath,canceled}=await dialog.showSaveDialog(win,{title:'Exportar resultados',defaultPath:'Resultados-Retenfix.csv',filters:[{name:'Planilha CSV',extensions:['csv']}]});
    if(canceled)return false;
    const rows=store.history().filter(r=>r.finished);
    const csv=[['Nome','Equipe','Início','Conclusão','Pontos (0 a 100)','Situação'],...rows.map(r=>[r.name,r.track,r.started,r.finished,r.score,r.score>=80?'Aprovado':'Revisar'])].map(row=>row.map(csvCell).join(';')).join('\r\n');
    fs.writeFileSync(filePath,'\ufeff'+csv,'utf8');return true;
  });
  register('backup',async()=>{
    const {filePath,canceled}=await dialog.showSaveDialog(win,{title:'Salvar cópia do histórico',defaultPath:'Retenfix-Historico-'+new Date().toISOString().slice(0,10)+'.json',filters:[{name:'Backup JSON',extensions:['json']}]});
    if(canceled)return false;
    fs.writeFileSync(filePath,JSON.stringify({app:'Retenfix Academia',version:1,exported:new Date().toISOString(),exams:store.history().map(r=>store.session(r.id))},null,2),'utf8');return true;
  });
  register('dataFolder',()=>shell.openPath(app.getPath('userData')));
  win=new BrowserWindow({width:1460,height:930,minWidth:980,minHeight:650,show:!process.argv.includes('--hidden'),title:'Retenfix Academia',backgroundColor:'#f4f7fa',icon:nativeImage.createFromPath(path.join(__dirname,'assets','retenfix.png')),autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,spellcheck:false}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(url.split('#')[0]!==indexURL)event.preventDefault();});
  win.loadURL(indexURL);
});
app.on('window-all-closed',()=>app.quit());
app.on('will-quit',()=>store?.close());
