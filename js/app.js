const App = (() => {
  const $ = id => document.getElementById(id);
  let activeView = "dashboard";
  let slideWorkId = null, slideParts = [], slideIndex = 0, slideBackgrounds = [];
  const views = {dashboard:"dashboardView",all:"allView",editor:"editorView",slides:"slidesView"};
  const esc = value => String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200);}
  function showView(view){
    activeView=view;
    Object.entries(views).forEach(([key,id])=>$(id).classList.toggle("active",key===view));
    document.querySelectorAll(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===view));
    $("breadcrumbCurrent").textContent={dashboard:"Dashboard",all:"Semua tulisan",editor:"Editor tulisan",slides:"Studio Instagram"}[view]||"Ruang kerja";
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function empty(message){return `<div class="empty-state">${message}</div>`;}
  function row(item){
    const date=item.updatedAt?new Date(item.updatedAt).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"Baru";
    return `<div class="work-row" data-open="${esc(item.id)}"><div class="work-icon">✎</div><div class="work-info"><strong>${esc(item.title||"Tanpa judul")}</strong><small>${esc(item.category)} · ${date} · ${(item.body||"").trim().split(/\s+/).filter(Boolean).length} kata</small></div><span class="work-status">${esc((item.status||"Draft").toUpperCase())}</span></div>`;
  }
  function refresh(){
    const items=Storage.getAll();
    $("allCount").textContent=items.length;
    $("statTotal").textContent=items.length;
    $("statDraft").textContent=items.filter(x=>x.status!=="Selesai").length;
    $("statSlides").textContent=items.filter(x=>x.slides&&x.slides.length).reduce((n,x)=>n+x.slides.length,0);
    $("recentList").innerHTML=items.length?items.slice(0,4).map(row).join(""):empty("Belum ada tulisan. Mulailah dengan satu ide kecil.");
    renderAll();
    bindRows();
  }
  function renderAll(){
    const query=($("searchInput")?.value||"").toLowerCase();
    const status=$("statusFilter")?.value||"all";
    const items=Storage.getAll().filter(item=>(item.title+" "+item.body).toLowerCase().includes(query)&&(status==="all"||item.status===status));
    $("allList").innerHTML=items.length?items.map(row).join(""):empty("Tidak ada tulisan yang cocok. Coba buat tulisan baru.");
    bindRows();
  }
  function bindRows(){document.querySelectorAll("[data-open]").forEach(el=>el.addEventListener("click",()=>Editor.open(el.dataset.open)));}
  function newWork(){Editor.open(null);}
  function openSlides(id){
    showView("slides");
    const items=Storage.getAll();
    if(!items.length){toast("Buat tulisan terlebih dahulu.");return;}
    slideWorkId=id||items[0].id;
    populateSlideSelect();
    loadSlideWork();
  }
  function populateSlideSelect(){
    const items=Storage.getAll();
    $("slideWorkSelect").innerHTML=items.map(x=>`<option value="${esc(x.id)}">${esc(x.title||"Tanpa judul")}</option>`).join("");
    if(slideWorkId && items.some(x=>x.id===slideWorkId)) $("slideWorkSelect").value=slideWorkId;
  }
  function loadSlideWork(){
    const item=Storage.get(slideWorkId);
    if(!item)return;
    $("slideCoverTitle").value=item.slideTitle||item.title||"";
    slideParts=item.slides&&item.slides.length?item.slides.slice():splitIntoParts(item.body||"");
    if(!slideParts.length)slideParts=[""];
    slideBackgrounds=slideParts.map((_,i)=>normalizeBackground(item.slideBackgrounds?.[i]||DEFAULT_BACKGROUND));
    slideIndex=0;renderSlideEditors();syncBackgroundControls();renderCarousel();
  }
  function splitIntoParts(body){
    const paragraphs=body.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
    if(!paragraphs.length)return [];
    const parts=[];let current="";
    paragraphs.forEach(p=>{
      if((current+" "+p).trim().length>180&&current){parts.push(current);current=p;}
      else current+=(current?"\n\n":"")+p;
    });
    if(current)parts.push(current);
    return parts;
  }
  function renderSlideEditors(){
    $("slideEditors").innerHTML=slideParts.map((part,i)=>`<div class="slide-editor"><div class="slide-editor-head"><strong>SLIDE ${String(i+1).padStart(2,"0")}</strong><button class="tiny-delete" data-remove-slide="${i}" title="Hapus slide">Hapus ×</button></div><textarea data-slide-index="${i}" placeholder="Tulis isi slide ${i+1}...">${esc(part)}</textarea></div>`).join("");
    document.querySelectorAll("[data-slide-index]").forEach(el=>el.addEventListener("input",()=>{slideParts[Number(el.dataset.slideIndex)]=el.value;renderCarousel();}));
    document.querySelectorAll("[data-remove-slide]").forEach(el=>el.addEventListener("click",()=>{if(slideParts.length===1){slideParts[0]="";}else slideParts.splice(Number(el.dataset.removeSlide),1);slideBackgrounds.splice(Number(el.dataset.removeSlide),1);slideIndex=Math.min(slideIndex,slideParts.length-1);renderSlideEditors();syncBackgroundControls();renderCarousel();}));
  }
  const DEFAULT_BACKGROUND={type:"solid",color:"#292824",color2:"#665747"};
  function normalizeBackground(bg){
    return {type:bg?.type==="gradient"?"gradient":"solid",color:/^#[0-9a-f]{6}$/i.test(bg?.color||"")?bg.color:"#292824",color2:/^#[0-9a-f]{6}$/i.test(bg?.color2||"")?bg.color2:"#665747"};
  }
  function currentBackground(){return normalizeBackground(slideBackgrounds[slideIndex]);}
  function backgroundCss(bg){
    return bg.type==="gradient"?`linear-gradient(135deg, ${bg.color}, ${bg.color2})`:bg.color;
  }
  function syncBackgroundControls(){
    const bg=currentBackground();
    $("slideBgMode").value=bg.type;$("slideBgColor").value=bg.color;$("slideBgColor2").value=bg.color2;
    $("slideBgColor2Wrap").style.display=bg.type==="gradient"?"grid":"none";
  }
  function updateBackground(){
    slideBackgrounds[slideIndex]=normalizeBackground({type:$("slideBgMode").value,color:$("slideBgColor").value,color2:$("slideBgColor2").value});
    syncBackgroundControls();renderCarousel();
  }
  function renderCarousel(){
    const item=Storage.get(slideWorkId);
    const count=slideParts.length||1;
    slideIndex=Math.max(0,Math.min(slideIndex,count-1));
    const text=slideParts[slideIndex]||"Tulisanmu akan hadir di sini.";
    $("carouselContent").textContent=slideIndex===0&&$("slideCoverTitle").value.trim()?$("slideCoverTitle").value.trim()+"\n\n"+text:text;
    const bg=currentBackground();
    const card=$("carouselCard");
    card.style.background=backgroundCss(bg);
    const luminance=hex=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
    const lightText=(luminance(bg.color)+ (bg.type==="gradient"?luminance(bg.color2):luminance(bg.color)))/2<0.42;
    card.style.color=lightText?"#eee6d8":"#292824";
    $("carouselBrand").style.color=lightText?"#c5b69e":"#665747";
    $("carouselContent").style.color=lightText?"#eee6d8":"#292824";
    $("carouselFooter").style.color=lightText?"#c1b39c":"#665747";
    $("carouselCategory").style.color=lightText?"#c1b39c":"#665747";
    $("carouselNumber").style.color=lightText?"#c1b39c":"#665747";
    $("carouselCategory").textContent=(item?.category||"REFLEKSI").toUpperCase();
    $("carouselNumber").textContent=String(slideIndex+1).padStart(2,"0")+" / "+String(count).padStart(2,"0");
    $("slideCounter").textContent=`SLIDE ${slideIndex+1} / ${count}`;
    $("carouselPosition").textContent=`${slideIndex+1} dari ${count}`;
  }
  function saveSlides(){
    const item=Storage.get(slideWorkId);if(!item)return;
    item.slides=slideParts;item.slideTitle=$("slideCoverTitle").value.trim();item.slideBackgrounds=slideParts.map((_,i)=>normalizeBackground(slideBackgrounds[i]));Storage.save(item);refresh();toast("Susunan slide berhasil disimpan.");
  }
  function exportSlides(){
    const item=Storage.get(slideWorkId);if(!item)return;
    const title=$("slideCoverTitle").value.trim()||item.title||"Carousel";
    const content=[title,"",...slideParts.flatMap((part,i)=>[`SLIDE ${i+1}`,part,""])].join("\n");
    const blob=new Blob([content],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="carousel-"+title.toLowerCase().replace(/[^a-z0-9]+/g,"-")+".txt";a.click();URL.revokeObjectURL(url);
  }
  const PNG_WIDTH=1080, PNG_HEIGHT=1350;
  const safeFileName=value=>String(value||"ruang-ingatan").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"ruang-ingatan";
  function wrapCanvasText(ctx,text,maxWidth){
    const lines=[];
    String(text||"").split("\n").forEach(paragraph=>{
      if(!paragraph){lines.push("");return;}
      const words=paragraph.split(/\s+/);let line="";
      words.forEach(word=>{
        const candidate=line?line+" "+word:word;
        if(line&&ctx.measureText(candidate).width>maxWidth){lines.push(line);line=word;}
        else line=candidate;
      });
      if(line)lines.push(line);
    });
    return lines;
  }
  function makeSlideCanvas(index){
    const item=Storage.get(slideWorkId);if(!item)throw new Error("Tulisan tidak ditemukan.");
    const count=Math.max(1,slideParts.length);
    const raw=slideParts[index]||"Tulisanmu akan hadir di sini.";
    const content=index===0&&$("slideCoverTitle").value.trim()?$("slideCoverTitle").value.trim()+"\n\n"+raw:raw;
    const canvas=document.createElement("canvas");canvas.width=PNG_WIDTH;canvas.height=PNG_HEIGHT;
    const ctx=canvas.getContext("2d");
    const bg=normalizeBackground(slideBackgrounds[index]);
    const luminance=hex=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
    const lightText=(luminance(bg.color)+(bg.type==="gradient"?luminance(bg.color2):luminance(bg.color)))/2<0.42;
    const primaryText=lightText?"#eee6d8":"#292824";
    const secondaryText=lightText?"#c5b69e":"#665747";
    if(bg.type==="gradient"){
      const gradient=ctx.createLinearGradient(0,0,PNG_WIDTH,PNG_HEIGHT);gradient.addColorStop(0,bg.color);gradient.addColorStop(1,bg.color2);ctx.fillStyle=gradient;
    }else ctx.fillStyle=bg.color;
    ctx.fillRect(0,0,PNG_WIDTH,PNG_HEIGHT);
    const pad=88;
    ctx.textBaseline="top";
    ctx.fillStyle=secondaryText;ctx.font='600 25px "DM Sans", sans-serif';ctx.textAlign="left";
    ctx.fillText("RUANG INGATAN",pad,82);
    ctx.fillStyle=secondaryText;ctx.font='500 21px "DM Sans", sans-serif';ctx.textAlign="right";
    ctx.fillText("CATATAN KECIL",PNG_WIDTH-pad,84);

    const maxWidth=PNG_WIDTH-pad*2;
    let fontSize=76, lineHeight=1.35, lines=[];
    do{
      ctx.font=`500 ${fontSize}px "Playfair Display", Georgia, serif`;
      lines=wrapCanvasText(ctx,content,maxWidth);
      if(lines.length*fontSize*lineHeight<=PNG_HEIGHT-390||fontSize<=34)break;
      fontSize-=2;
    }while(fontSize>=34);
    const lineStep=fontSize*lineHeight;
    const blockHeight=lines.length*lineStep;
    if(blockHeight>PNG_HEIGHT-390)throw new Error("Teks terlalu panjang untuk satu slide. Pecah menjadi beberapa slide agar tidak terpotong.");
    let y=Math.max(245,(PNG_HEIGHT-blockHeight)/2-5);
    ctx.fillStyle=primaryText;ctx.textAlign="left";ctx.textBaseline="top";
    lines.forEach(line=>{if(line)ctx.fillText(line,pad,y);y+=lineStep;});

    ctx.fillStyle=secondaryText;ctx.font='600 22px "DM Sans", sans-serif';ctx.textAlign="left";
    ctx.fillText(String(item.category||"REFLEKSI").toUpperCase(),pad,PNG_HEIGHT-112);
    ctx.textAlign="right";ctx.fillText(`${String(index+1).padStart(2,"0")} / ${String(count).padStart(2,"0")}`,PNG_WIDTH-pad,PNG_HEIGHT-112);
    return canvas;
  }
  function canvasToBlob(canvas){
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Gagal membuat gambar PNG.")),"image/png"));
  }
  async function downloadSlidePng(index){
    const item=Storage.get(slideWorkId);if(!item)return;
    await document.fonts.ready;
    if(document.fonts.load){await Promise.all([document.fonts.load('500 76px "Playfair Display"'),document.fonts.load('600 25px "DM Sans"')]);}
    const blob=await canvasToBlob(makeSlideCanvas(index));
    const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download=`${safeFileName($("slideCoverTitle").value||item.title)}-slide-${String(index+1).padStart(2,"0")}.png`;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  async function exportCurrentPng(){
    if(!Storage.get(slideWorkId)){toast("Pilih tulisan terlebih dahulu.");return;}
    try{await downloadSlidePng(slideIndex);toast("PNG slide berhasil dibuat · 1080 × 1350 px");}
    catch(error){console.error(error);toast("Ekspor PNG gagal. Coba lagi.");}
  }
  async function exportAllPng(){
    if(!Storage.get(slideWorkId)){toast("Pilih tulisan terlebih dahulu.");return;}
    const button=$("exportAllPngBtn");button.disabled=true;button.textContent="Menyiapkan PNG...";
    try{
      for(let i=0;i<slideParts.length;i++){
        await downloadSlidePng(i);
        if(i<slideParts.length-1)await new Promise(resolve=>setTimeout(resolve,350));
      }
      toast(`${slideParts.length} PNG berhasil dibuat.`);
    }catch(error){console.error(error);toast(error.message.includes("terlalu panjang")?error.message:"Ekspor semua slide terhenti. Coba unduh per slide.");}
    finally{button.disabled=false;button.textContent="Unduh semua slide (PNG)";}
  }
  function init(){
    Editor.init();
    document.querySelectorAll("[data-view]").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.view)));
    document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.go)));
    $("newWorkBtn").addEventListener("click",newWork);$("quickWrite").addEventListener("click",newWork);$("allNewBtn").addEventListener("click",newWork);
    $("quickSlides").addEventListener("click",()=>openSlides());$("quickArchive").addEventListener("click",()=>showView("all"));
    $("searchInput").addEventListener("input",renderAll);$("statusFilter").addEventListener("change",renderAll);
    document.querySelectorAll("[data-category]").forEach(btn=>btn.addEventListener("click",()=>{showView("all");$("searchInput").value=btn.dataset.category;renderAll();}));
    $("slideWorkSelect").addEventListener("change",e=>{slideWorkId=e.target.value;loadSlideWork();});
    $("addSlideBtn").addEventListener("click",()=>{slideParts.push("");slideBackgrounds.push({...DEFAULT_BACKGROUND});renderSlideEditors();slideIndex=slideParts.length-1;syncBackgroundControls();renderCarousel();});
    $("saveSlidesBtn").addEventListener("click",saveSlides);$("exportSlidesBtn").addEventListener("click",exportSlides);
    $("exportCurrentPngBtn").addEventListener("click",exportCurrentPng);$("exportAllPngBtn").addEventListener("click",exportAllPng);
    $("prevSlide").addEventListener("click",()=>{slideIndex=Math.max(0,slideIndex-1);syncBackgroundControls();renderCarousel();});
    $("nextSlide").addEventListener("click",()=>{slideIndex=Math.min(slideParts.length-1,slideIndex+1);syncBackgroundControls();renderCarousel();});
    $("slideCoverTitle").addEventListener("input",renderCarousel);
    ["slideBgMode","slideBgColor","slideBgColor2"].forEach(id=>$(id).addEventListener("input",updateBackground));
    document.querySelectorAll("[data-bg-preset]").forEach(btn=>btn.addEventListener("click",()=>{const presets={dark:{type:"solid",color:"#292824",color2:"#665747"},cream:{type:"solid",color:"#eee6d8",color2:"#c5b69e"},brown:{type:"gradient",color:"#4b3528",color2:"#9a7656"},olive:{type:"gradient",color:"#34382e",color2:"#788064"}};const bg=presets[btn.dataset.bgPreset];$("slideBgMode").value=bg.type;$("slideBgColor").value=bg.color;$("slideBgColor2").value=bg.color2;updateBackground();}));
    $("addSlideWorkBtn").addEventListener("click",()=>{const items=Storage.getAll();if(!items.length){toast("Buat tulisan terlebih dahulu.");return;}slideWorkId=items[0].id;populateSlideSelect();loadSlideWork();});
    $("menuBtn").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
    document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>$("sidebar").classList.remove("open")));
    refresh();
  }
  return {init,showView,refresh,toast,openSlides};
})();
document.addEventListener("DOMContentLoaded",App.init);
