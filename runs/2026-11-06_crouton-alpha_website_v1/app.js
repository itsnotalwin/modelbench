"use strict";
/* The Grey Index — app.js. No dependencies. All greys, all client-side. */
const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const hexOf=v=>"#"+[v,v,v].map(x=>x.toString(16).padStart(2,"0")).join("");
const lum=v=>{const c=v/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);const hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+.05)/(lo+.05)};
const fmtRatio=r=>r.toFixed(2)+" : 1";
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Toast */
let toastTimer;
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2200)}
async function copyText(text,msg){
  try{await navigator.clipboard.writeText(text)}
  catch(e){const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove()}
  toast(msg||("Copied "+text));
}

/* Nav toggle */
const navToggle=$("#navToggle"), primaryNav=$("#primaryNav");
navToggle.addEventListener("click",()=>{
  const open=primaryNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded",String(open));
});
primaryNav.addEventListener("click",e=>{if(e.target.tagName==="A"){primaryNav.classList.remove("open");navToggle.setAttribute("aria-expanded","false")}});

/* Shade of the day — deterministic from date */
(function shadeOfDay(){
  const now=new Date(), start=new Date(now.getFullYear(),0,0);
  const day=Math.floor((now-start)/86400000), v=day%256;
  $("#shadeDay").innerHTML=`Shade of the day — <strong>${v} · ${hexOf(v)}</strong>`;
  $("#shadeDay").style.background=hexOf(v);
  $("#shadeDay").style.color=v<128?"#fff":"#000";
})();

/* Clock + year */
$("#year").textContent=new Date().getFullYear();
setInterval(()=>{$("#clock").textContent=new Date().toLocaleTimeString()},1000);
$("#clock").textContent=new Date().toLocaleTimeString();

/* Reading progress */
addEventListener("scroll",()=>{
  const h=document.documentElement, p=h.scrollTop/(h.scrollHeight-h.clientHeight||1);
  $("#progress").style.width=(p*100)+"%";
},{passive:true});

/* Marquee content */
(function marquee(){
  const words=["BLACK #000000","0","CHARCOAL","#222222","SLATE","#555555","SILVER","#808080","128","PEARL","#CCCCCC","WHITE #FFFFFF","255"];
  const seq=words.map(w=>`<span>${w}</span>`).join("");
  $("#marqueeTrack").innerHTML=seq+seq;
})();

/* HERO luminosity */
const hero=$("#top"), heroRange=$("#heroRange"), heroOut=$("#heroOut"), heroNum=$("#heroNum");
let heroValue=128;
function paintHero(){
  const h=hexOf(heroValue);
  hero.style.background=h;
  hero.classList.toggle("hero-dark",heroValue<128);
  heroNum.textContent=heroValue;
  heroOut.textContent=`${heroValue} · ${h}`;
  heroRange.setAttribute("aria-valuetext",`Shade ${heroValue}, hex ${h}`);
}
heroRange.addEventListener("input",()=>{heroValue=+heroRange.value;paintHero()});
$("#copyHero").addEventListener("click",()=>copyText(hexOf(heroValue)));
paintHero();

/* 01 RAMP */
const NAMED={0:"Black",128:"Grey / Gray",192:"Silver",211:"LightGrey",255:"White"};
let selectedShade=128;
const rampGrid=$("#rampGrid");
const swatches=[];
for(let v=0;v<256;v++){
  const b=document.createElement("button");
  b.type="button";b.className="swatch";b.style.background=hexOf(v);
  b.dataset.value=v;b.setAttribute("role","gridcell");
  b.setAttribute("aria-label",`Shade ${v}, hex ${hexOf(v)}`);
  b.tabIndex=v===selectedShade?0:-1;
  b.addEventListener("click",()=>selectShade(v,false));
  b.addEventListener("keydown",e=>{
    let n=null;
    if(e.key==="Enter"||e.key===" "){e.preventDefault();selectShade(v,true);return}
    if(e.key==="ArrowRight")n=Math.min(255,v+1);
    if(e.key==="ArrowLeft")n=Math.max(0,v-1);
    if(e.key==="ArrowDown")n=Math.min(255,v+16);
    if(e.key==="ArrowUp")n=Math.max(0,v-16);
    if(e.key==="Home")n=0; if(e.key==="End")n=255;
    if(n!==null){e.preventDefault();selectShade(n,false);swatches[n].focus()}
  });
  rampGrid.appendChild(b);swatches.push(b);
}
function selectShade(v,copy){
  selectedShade=v;
  swatches.forEach((s,i)=>{s.tabIndex=i===v?0:-1;s.classList.toggle("is-selected",i===v)});
  const h=hexOf(v);
  $("#inspSwatch").style.background=h;
  $("#inspValue").textContent=v;
  $("#inspHex").textContent=h;
  $("#inspRgb").textContent=`${v} · ${v} · ${v}`;
  $("#inspLum").textContent=lum(v).toFixed(4);
  $("#inspOnBlack").textContent=fmtRatio(ratio(v,0));
  $("#inspOnWhite").textContent=fmtRatio(ratio(v,255));
  $("#inspName").textContent=NAMED[v]||"—";
  if(copy)copyText(h);
}
$("#copyInsp").addEventListener("click",()=>copyText(hexOf(selectedShade)));
$("#sendToContrast").addEventListener("click",()=>{
  setContrast("text",selectedShade);setContrast("bg",255-selectedShade);
  document.getElementById("contrast").scrollIntoView({behavior:reduced?"auto":"smooth"});
  toast(`Sent ${hexOf(selectedShade)} to the Contrast Lab`);
});
selectShade(128,false);

/* 02 CONTRAST */
function setContrast(which,v){
  v=clamp(v|0,0,255);
  if(which==="text"){$("#textRange").value=v;$("#textHex").value=hexOf(v);$("#textVal").textContent=v}
  else{$("#bgRange").value=v;$("#bgHex").value=hexOf(v);$("#bgVal").textContent=v}
  paintContrast();
}
function readHex(input,range){
  const m=/^#([0-9a-fA-F]{6})$/.exec(input.value.trim());
  if(m){const v=parseInt(m[1].slice(0,2),16);range.value=v}
  paintContrast();
}
function paintContrast(){
  const t=+$("#textRange").value,b=+$("#bgRange").value;
  $("#textHex").value=hexOf(t);$("#bgHex").value=hexOf(b);
  $("#textVal").textContent=t;$("#bgVal").textContent=b;
  const pv=$("#contrastPreview");pv.style.background=hexOf(b);pv.style.color=hexOf(t);
  const r=ratio(t,b);
  $("#ratioOut").textContent=fmtRatio(r);
  const grade=(el,pass)=>{el.textContent=pass?"Pass ✓":"Fail ✗";el.className=pass?"pass":"fail"};
  grade($("#aaOut"),r>=4.5);grade($("#aaLargeOut"),r>=3);grade($("#aaaOut"),r>=7);grade($("#aaaLargeOut"),r>=4.5);
}
$("#textRange").addEventListener("input",paintContrast);
$("#bgRange").addEventListener("input",paintContrast);
$("#textHex").addEventListener("change",()=>readHex($("#textHex"),$("#textRange")));
$("#bgHex").addEventListener("change",()=>readHex($("#bgHex"),$("#bgRange")));
$("#swapContrast").addEventListener("click",()=>{const t=+$("#textRange").value,b=+$("#bgRange").value;setContrast("text",b);setContrast("bg",t)});
$("#invertContrast").addEventListener("click",()=>{setContrast("text",255-+$("#textRange").value);setContrast("bg",255-+$("#bgRange").value)});
paintContrast();

/* 03 HALFTONE */
const canvas=$("#halftoneCanvas"), ctx=canvas.getContext("2d");
const off=document.createElement("canvas");off.width=canvas.width;off.height=canvas.height;
let subject="figure";
function drawSubject(){
  const o=off.getContext("2d"), W=off.width,H=off.height;
  o.fillStyle="#fff";o.fillRect(0,0,W,H);o.fillStyle="#000";
  if(subject==="figure"){
    o.beginPath();o.arc(W/2,H*0.32,86,0,7);o.fill();
    o.beginPath();o.moveTo(W/2-180,H);o.quadraticCurveTo(W/2,H*0.42,W/2+180,H);o.closePath();o.fill();
    o.fillStyle="#888";o.beginPath();o.arc(W/2+30,H*0.30,20,0,7);o.fill();
  }else if(subject==="wave"){
    for(let x=0;x<W;x+=4){
      const y=H/2+Math.sin(x/52)*120+Math.sin(x/13)*30;
      o.fillRect(x,y,4,6+Math.abs(Math.sin(x/20))*90);
    }
    o.fillStyle="#555";o.beginPath();o.arc(W*0.78,H*0.22,54,0,7);o.fill();
  }else{
    o.font="900 150px Georgia, serif";o.textAlign="center";o.textBaseline="middle";
    o.fillText("GREY",W/2,H*0.42);
    o.font="700 44px Georgia, serif";o.fillStyle="#444";
    o.fillText("0 — 255",W/2,H*0.68);
    o.strokeStyle="#000";o.lineWidth=3;o.beginPath();o.moveTo(90,H*0.82);o.lineTo(W-90,H*0.82);o.stroke();
  }
}
function renderHalftone(){
  drawSubject();
  const {width:W,height:H}=off, src=off.getContext("2d").getImageData(0,0,W,H).data;
  const cell=+$("#cellRange").value, angle=+$("#angleRange").value*Math.PI/180, gain=+$("#gainRange").value/100, inv=$("#invertDots").checked;
  $("#cellOut").textContent=cell;$("#angleOut").textContent=$("#angleRange").value+"°";$("#gainOut").textContent=$("#gainRange").value+"%";
  ctx.fillStyle=inv?"#000":"#fff";ctx.fillRect(0,0,W,H);
  ctx.fillStyle=inv?"#fff":"#000";
  const cos=Math.cos(angle),sin=Math.sin(angle);let count=0;
  for(let gy=-H;gy<H+W;gy+=cell){
    for(let gx=-W;gx<W+H;gx+=cell){
      const x=gx*cos-gy*sin, y=gx*sin+gy*cos;
      if(x<0||x>=W||y<0||y>=H)continue;
      const v=src[((y|0)*W+(x|0))*4]/255; /* 1=white source */
      let ink=inv?v:1-v;
      ink=clamp(ink*gain,0,1);
      const r=Math.sqrt(ink)*(cell*0.62);
      if(r<0.4)continue;
      ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();count++;
    }
  }
  $("#dotCount").textContent=count.toLocaleString();
}
["cellRange","angleRange","gainRange","invertDots"].forEach(id=>$("#"+id).addEventListener("input",renderHalftone));
$$(".seg-btn[data-subject]").forEach(b=>b.addEventListener("click",()=>{
  subject=b.dataset.subject;
  $$(".seg-btn[data-subject]").forEach(x=>{x.classList.toggle("is-on",x===b);x.setAttribute("aria-pressed",String(x===b))});
  renderHalftone();
}));
$("#downloadHalftone").addEventListener("click",()=>{
  const a=document.createElement("a");a.download=`grey-index-halftone-${subject}.png`;a.href=canvas.toDataURL("image/png");a.click();
  toast("PNG downloaded");
});
$("#randomHalftone").addEventListener("click",()=>{
  const subs=["figure","wave","word"];subject=subs[Math.random()*3|0];
  $$(".seg-btn[data-subject]").forEach(x=>{const on=x.dataset.subject===subject;x.classList.toggle("is-on",on);x.setAttribute("aria-pressed",String(on))});
  $("#cellRange").value=4+Math.random()*18|0;$("#angleRange").value=Math.random()*91|0;$("#gainRange").value=50+Math.random()*120|0;
  renderHalftone();toast("Rolled the press. Good luck.");
});
renderHalftone();

/* 04 TYPE TESTER */
const FONTS={serif:'"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif',sans:'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',mono:'ui-monospace,"Cascadia Mono",Menlo,Consolas,monospace'};
let fontKey="serif";
function paintType(){
  const size=+$("#sizeRange").value, weight=+$("#weightRange").value, track=(+$("#trackRange").value/100), lead=(+$("#leadRange").value/100);
  const text=$("#typeText").value||"Grey is a decision";
  $("#sizeOut").textContent=size+"px";$("#weightOut").textContent=weight;
  $("#trackOut").textContent=track.toFixed(2)+"em";$("#leadOut").textContent=lead.toFixed(2);
  const pv=$("#typePreview");
  pv.textContent=$("#upperToggle").checked?text.toUpperCase():text;
  pv.style.fontFamily=FONTS[fontKey];pv.style.fontSize=size+"px";pv.style.fontWeight=weight;
  pv.style.letterSpacing=track+"em";pv.style.lineHeight=lead;
  $("#cssOut").textContent=
`.display {\n  font-family: ${FONTS[fontKey]};\n  font-size: ${size}px;\n  font-weight: ${weight};\n  letter-spacing: ${track.toFixed(2)}em;\n  line-height: ${lead.toFixed(2)};\n  color: #111;\n  background: #fff;\n}`;
}
["sizeRange","weightRange","trackRange","leadRange","upperToggle","typeText"].forEach(id=>$("#"+id).addEventListener("input",paintType));
$$(".seg-btn[data-font]").forEach(b=>b.addEventListener("click",()=>{
  fontKey=b.dataset.font;
  $$(".seg-btn[data-font]").forEach(x=>{x.classList.toggle("is-on",x===b);x.setAttribute("aria-pressed",String(x===b))});
  paintType();
}));
$("#copyCss").addEventListener("click",()=>copyText($("#cssOut").textContent,"CSS copied"));
paintType();

/* 05 ARCHIVE */
const ARCHIVE=[
{n:"Charcoal",k:"Mineral",v:24,d:"Burnt willow twigs, the oldest drawing material. Softer and blacker than any pencil.",note:"Artists have used it since cave walls. Smudges if you breathe on it."},
{n:"Graphite 9B",k:"Mineral",v:38,d:"The softest pencil grade. Mostly clay and wax pretending to be lead.",note:"9B is near the bottom of the scale — commercially, nothing darker is sold."},
{n:"Photocopy Toner",k:"Manufactured",v:28,d:"Fused plastic powder, blackened with carbon. The smell of every office at 5pm.",note:"A fresh cartridge prints near-black; a dying one prints in reluctant grey."},
{n:"Wet Asphalt",k:"Manufactured",v:44,d:"Bitumen and aggregate, darker when wet because water kills the reflections.",note:"Wet roads read ~30% darker than the same road dry. Drivers know this in their bones."},
{n:"Elephant Hide",k:"Biological",v:102,d:"Two centimetres of wrinkled skin, the colour of dust that has settled for a year.",note:"Elephants are almost hairless; what looks like grey is mostly skin and dried mud."},
{n:"Dolphin Back",k:"Biological",v:110,d:"Countershading: dark above, pale below. A camouflage argument made in grey.",note:"Seen from above against deep water, the back vanishes. From below, the belly does."},
{n:"Basalt",k:"Mineral",v:58,d:"Volcanic rock, cooled lava. The 'black' in black sand beaches is mostly basalt.",note:"Basalt makes up most of the ocean floor. Earth's most common rock is dark grey."},
{n:"Portland Cement",k:"Manufactured",v:150,d:"The grey that built the twentieth century — floor slabs, dams, tower blocks.",note:"Cement is grey because of iron oxide and lime; add pigment and you get colour cement."},
{n:"Fog (100 m visibility)",k:"Atmospheric",v:178,d:"Suspended water droplets scattering light. Fog is not white; it is unresolved sky.",note:"In dense fog, distant objects converge toward the colour of the air itself."},
{n:"Moonlight on Water",k:"Atmospheric",v:162,d:"Reflected sunlight, roughly a 400,000-fold dimming. The brightest night gets.",note:"A full moon is about as bright as a dim office. It only looks bright by contrast."},
{n:"Newsprint (aged)",k:"Manufactured",v:205,d:"Cheap paper, lignin still in it. Ages from white to cream to the colour of this entry.",note:"Lignin oxidises in light. That is why old newspapers fade — and why this one is grey."},
{n:"Slate",k:"Mineral",v:88,d:"Metamorphosed mudstone, split into sheets. Roofing material for 500 years.",note:"Welsh slate was exported worldwide; the industry employed 15,000 men at its peak."},
{n:"Ash (wood)",k:"Mineral",v:170,d:"Mineral residue of burned wood: calcium, potassium, carbon black flecks.",note:"Wood ash is alkaline — historically used for soap, leather tanning and lye."},
{n:"Smoke (cigarette, exhaled)",k:"Atmospheric",v:190,d:"Sub-micron particles scattering light — brighter than the cigarette, dimmer than air.",note:"Smoke looks grey-white because particles scatter all wavelengths equally."},
{n:"Granite (polished)",k:"Mineral",v:140,d:"Quartz, feldspar and mica locked together. Speckled because it refuses to be one colour.",note:"Granite counters are grey because each mineral grain is a different shade at once."},
{n:"Pewter",k:"Manufactured",v:135,d:"Tin alloy with lead and antimony, oxidising to a soft grey bloom.",note:"Untouched pewter darkens over decades. Polishing it back is called 'brightening'."},
{n:"Silver (tarnished)",k:"Mineral",v:120,d:"Silver sulphide, formed by sulphur in air. Tarnish is black; the metal beneath is not.",note:"Tarnish grows from the surface inward. Aggressive polishing removes silver itself."},
{n:"Silver Halide (photographic)",k:"Photographic",v:96,d:"Crystals of silver bromide in film emulsion. Exposure turns them to metallic silver — grey.",note:"A photograph is literally a pattern of silver particles. The image is the metal."},
{n:"Gelatin Silver Print (mid-grey)",k:"Photographic",v:128,d:"The working grey of a darkroom print, zoned between the paper's white and its deepest black.",note:"Adams' Zone V: 'average' grey, the zone of things as they are."},
{n:"Photocopy (3rd generation)",k:"Photographic",v:200,d:"Each generation loses contrast and gains fog. A third-generation copy is an rumour of the original.",note:"Fax machines inherited this problem. Every copy is a slightly worse memory."},
{n:"Concrete (weathered)",k:"Manufactured",v:158,d:"Cement, aggregate and bird lime. Weathering streaks it darker where water runs.",note:"The streaks are not dirt — they are leached calcium, drawn out by rain."},
{n:"Snow (in shadow)",k:"Atmospheric",v:215,d:"Snow in shadow is lit only by skylight, so shadowed snow photographs grey.",note:"Painters noticed this before photographers: shadowed snow is never white."},
{n:"Whale Shark Skin",k:"Biological",v:92,d:"Grey with pale spots, armoured in dermal denticles like sandpaper.",note:"The spots are unique to each shark — researchers identify individuals by them."},
{n:"Mercury (liquid)",k:"Mineral",v:176,d:"The only metal liquid at room temperature. Weighed in thermometers and barometers.",note:"Mercury's surface tension makes it bead like water on glass — perfect grey spheres."}];
const kinds=["all",...new Set(ARCHIVE.map(a=>a.k))];
const filterWrap=$("#archiveFilters");
kinds.forEach(k=>{
  const b=document.createElement("button");b.type="button";b.className="seg-btn"+(k==="all"?" is-on":"");
  b.textContent=k==="all"?"All":k;b.dataset.filter=k;b.setAttribute("aria-pressed",String(k==="all"));
  b.addEventListener("click",()=>{filter=k;$$(".seg-btn",filterWrap).forEach(x=>{const on=x.dataset.filter===k;x.classList.toggle("is-on",on);x.setAttribute("aria-pressed",String(on))});renderArchive()});
  filterWrap.appendChild(b);
});
let filter="all";
function renderArchive(){
  const q=$("#archiveSearch").value.trim().toLowerCase(), sort=$("#archiveSort").value;
  let items=ARCHIVE.filter(a=>(filter==="all"||a.k===filter)&&(!q||(a.n+" "+a.k+" "+a.d).toLowerCase().includes(q)));
  items.sort((x,y)=>sort==="dark"?x.v-y.v:sort==="light"?y.v-x.v:x.n.localeCompare(y.n));
  const grid=$("#archiveGrid");grid.innerHTML="";
  items.forEach((a,i)=>{
    const li=document.createElement("li");li.className="card";
    li.innerHTML=`<div class="card-swatch" style="background:${hexOf(a.v)}"><span>${a.v} · ${hexOf(a.v)}</span></div>
      <div class="card-body"><p class="card-kind">${a.k}</p><h3>${a.n}</h3><p>${a.d}</p>
      <button type="button" class="btn btn-ghost" data-i="${ARCHIVE.indexOf(a)}">Open dossier →</button></div>`;
    grid.appendChild(li);
  });
  $("#archiveCount").textContent=`${items.length} of ${ARCHIVE.length} shown`;
  $("#archiveEmpty").hidden=items.length>0;
  $$("button[data-i]",grid).forEach(b=>b.addEventListener("click",()=>openDetail(ARCHIVE[+b.dataset.i])));
}
$("#archiveSearch").addEventListener("input",renderArchive);
$("#archiveSort").addEventListener("change",renderArchive);
renderArchive();

/* Dialogs */
const detailDialog=$("#detailDialog"), shortcutsDialog=$("#shortcutsDialog");
function openDetail(a){
  $("#detailTitle").textContent=a.n;
  $("#detailBody").innerHTML=`
    <div class="detail-swatch" style="background:${hexOf(a.v)}"></div>
    <dl class="inspector-data">
      <div><dt>Kind</dt><dd>${a.k}</dd></div>
      <div><dt>Value</dt><dd>${a.v}</dd></div>
      <div><dt>Hex</dt><dd>${hexOf(a.v)}</dd></div>
      <div><dt>Contrast on white</dt><dd>${fmtRatio(ratio(a.v,255))}</dd></div>
    </dl>
    <p style="margin-top:14px">${a.d}</p><p>${a.note}</p>
    <button type="button" class="btn btn-dark" id="detailCopy">Copy ${hexOf(a.v)}</button>`;
  $("#detailCopy").addEventListener("click",()=>copyText(hexOf(a.v)));
  detailDialog.showModal();
}
$$("dialog").forEach(d=>$$("[data-close]",d).forEach(b=>b.addEventListener("click",()=>d.close())));
$("#shortcutsBtn").addEventListener("click",()=>shortcutsDialog.showModal());
addEventListener("keydown",e=>{
  if(e.key==="?"&&!/input|textarea|select/i.test(document.activeElement.tagName)&&!detailDialog.open&&!shortcutsDialog.open)shortcutsDialog.showModal();
});

/* Essay + misc */
$("#markRead").addEventListener("click",()=>{$("#readState").textContent="— marked read. Good. Now go and look at something grey, properly.";toast("Marked as read")});
$("#toTop").addEventListener("click",()=>scrollTo({top:0,behavior:reduced?"auto":"smooth"}));

/* Reveal on scroll */
if(!reduced&&"IntersectionObserver" in window){
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.12});
  $$(".section,.card,.contrast-preview,.type-stage").forEach(el=>{el.classList.add("reveal");io.observe(el)});
}
