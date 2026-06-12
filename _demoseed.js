/* Disky live-embed demo seed — runs INSIDE the app iframe's window (same origin).
   Populates IndexedDB with a rich, realistic catalog so every view (overview, search,
   map, backup, dupes, worldmap) looks alive. Returns once data is committed. */
window.diskySeedDemo = async function(win){
  win = win || window;
  const GB=1073741824, MB=1048576, TB=1099511627776, now=Date.now(), DAY=86400000;
  // idempotent: if this demo is already seeded (e.g. a second live embed on the page), don't re-seed
  const _pre=await new Promise((res)=>{ try{ const t=win.tx(['drives'],'readonly'); const r=t.objectStore('drives').getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>res([]); }catch(e){ res([]); } });
  if(_pre.some(d=>d.label==='Samsung T9')) return { drives:_pre.length, files:-1 };
  // wipe any prior demo data first — IndexedDB persists across loads, so without this
  // every page view would ADD another full set (5 → 10 → 15 … drives accumulating).
  await new Promise((res)=>{ try{ const t=win.tx(['drives','files'],'readwrite');
    t.objectStore('drives').clear(); t.objectStore('files').clear(); t.oncomplete=res; t.onerror=res; }catch(e){ res(); } });
  const drives=[
    { label:'Macintosh HD', driveType:'mac', cap:1*TB, used:0.62*TB, fc:184213, vn:'Macintosh HD' },
    { label:'Studio RAID', driveType:'raidsilver', cap:24*TB, used:18.4*TB, fc:512904, vn:'Studio_RAID' },
    { label:'LaCie Rugged', driveType:'rugged', cap:4*TB, used:3.1*TB, fc:48211, vn:'LaCie_Rugged' },
    { label:'Archiv 2023', driveType:'mybook', cap:8*TB, used:7.2*TB, fc:301755, vn:'Archiv_2023' },
    { label:'Sony A7S · Card', driveType:'card', cap:256*GB, used:201*GB, fc:1422, vn:'A7S_CARD' },
    { label:'Samsung T9', driveType:'t9', cap:2*TB, used:1.62*TB, fc:24817, vn:'Samsung_T9' },
  ];
  const ids=[];
  for(const d of drives){ const id=await win.addDrive({label:d.label,driveType:d.driveType,capacityBytes:d.cap,
    bytes:Math.round(d.used),fileCount:d.fc,volumeName:d.vn,volumeUUID:'uuid-'+d.vn,model:d.label,scannedAt:now-2*DAY}); ids.push(id); }
  const [MAC,RAID,LACIE,ARCH,CARD,T9]=ids;
  const rnd=(s)=>{ let x=Math.sin(s)*10000; return x-Math.floor(x); };
  const files=[]; let seed=7;
  const mk=(driveId,proj,sub,name,ext,size,hash,lat,lon)=>{ seed++;
    const f={driveId,project:'Projekte/'+proj,relPath:'Projekte/'+proj+'/'+sub+'/'+name+ext,name:name+ext,ext,
      size:Math.round(size),hash:hash||('h'+driveId+'_'+seed),mtime:now-Math.floor(rnd(seed)*200)*DAY};
    if(lat!=null){ f.lat=+(lat+(rnd(seed)-0.5)*0.015).toFixed(5); f.lon=+(lon+(rnd(seed*3)-0.5)*0.015).toFixed(5); }
    files.push(f); };
  // a project tree with a shoot location (GPS on footage)
  const buildProj=(driveId,proj,scale,lat,lon)=>{
    for(let i=1;i<=4;i++) mk(driveId,proj,'Footage','A001_C'+String(i).padStart(3,'0'),'.mxf',(8+rnd(i+driveId)*16)*GB*scale,null,lat,lon);
    for(let i=1;i<=4;i++) mk(driveId,proj,'Proxies','A001_C'+String(i).padStart(3,'0')+'_proxy','.mp4',(220+rnd(i)*400)*MB*scale);
    mk(driveId,proj,'Audio','O-Ton_Recorder','.wav',(180+rnd(driveId)*220)*MB);
    mk(driveId,proj,'Audio','Musik_Lizenz','.wav',120*MB);
    mk(driveId,proj,'Project',proj.replace(/ /g,'_'),'.prproj',(40+rnd(proj.length)*60)*MB);
    mk(driveId,proj,'Project',proj.replace(/ /g,'_')+'_AE','.aep',(60+rnd(driveId)*90)*MB);
    mk(driveId,proj,'Cache','Media Cache Files','.cfa',(600+rnd(2)*1400)*MB);
    mk(driveId,proj,'Cache','PeakFiles','.pek',(200+rnd(7)*300)*MB);
    mk(driveId,proj,'Grafik','Lowerthirds','.psd',(120+rnd(3)*180)*MB);
  };
  // distribute across drives, each project anchored to a real shoot location
  buildProj(RAID,'Hochzeit Tegernsee',1.2,47.71,11.75);
  buildProj(RAID,'Werbespot Hamburg',1.0,53.55,9.99);
  buildProj(RAID,'Imagefilm München',1.1,48.14,11.58);
  buildProj(RAID,'Doku Nordsee',1.3,54.91,8.31);
  buildProj(LACIE,'Reise Island',0.9,64.14,-21.94);
  buildProj(LACIE,'Musikvideo Aurora',0.8,69.65,18.95);
  buildProj(LACIE,'Kurzfilm Glut',1.0,52.52,13.40);
  buildProj(ARCH,'Hochzeit Tegernsee',1.2,47.71,11.75);
  buildProj(ARCH,'Doku Nordsee',1.3,53.87,8.69);
  buildProj(ARCH,'Doku Kapstadt',1.1,-33.92,18.42);
  buildProj(ARCH,'Branded Doc Lissabon',1.0,38.72,-9.14);
  buildProj(MAC,'Werbespot Hamburg',0.4,53.55,9.99);
  // the freshly-scanned Samsung T9 from the hero — same projects show up here in the real app
  buildProj(T9,'Hochzeit Tegernsee',1.0,47.71,11.75);
  buildProj(T9,'Werbespot Hamburg',0.9,53.55,9.99);
  buildProj(T9,'Doku Nordsee',1.0,54.91,8.31);
  buildProj(T9,'Reise Island',0.9,64.14,-21.94);
  // fresh card footage (one location)
  for(let i=1;i<=8;i++) mk(CARD,'Reise Japan','DCIM','C00'+i,'.mxf',(6+rnd(i)*10)*GB,null,35.68,139.69);
  // explicit cross-drive duplicates (same hash+size on multiple drives)
  const dup=(name,ext,size,hash,arr,proj,sub)=>{ for(const dr of arr){ seed++; files.push({driveId:dr,project:'Projekte/'+proj,
    relPath:'Projekte/'+proj+'/'+sub+'/'+name+ext,name:name+ext,ext,size:Math.round(size),hash,mtime:now-30*DAY}); } };
  dup('Werbespot_Hamburg_4K_final','.mp4',3.4*GB,'EXPdup1',[MAC,RAID,ARCH],'Werbespot Hamburg','Export');
  dup('Hochzeit_Trailer_final','.mp4',2.1*GB,'EXPdup2',[MAC,RAID,ARCH,LACIE],'Hochzeit Tegernsee','Export');
  dup('A001_C001','.mxf',14*GB,'FOOTdup1',[CARD,RAID],'Reise Japan','Footage');
  dup('Doku_Nordsee_Master_ProRes','.mov',46*GB,'MASTdup1',[RAID,ARCH],'Doku Nordsee','Master');
  dup('Imagefilm_Klinik_1080p','.mp4',1.8*GB,'EXPdup3',[RAID,ARCH],'Imagefilm München','Export');
  await new Promise((res,rej)=>{ const t=win.tx(['files'],'readwrite'); const s=t.objectStore('files');
    for(const f of files) s.put(f); t.oncomplete=res; t.onerror=()=>rej(t.error); });
  win.invalidateFiles && win.invalidateFiles();
  return { drives: ids.length, files: files.length };
};
