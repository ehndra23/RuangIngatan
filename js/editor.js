const Editor = (() => {
  let currentId = null;
  let debounceTimer = null;
  const $ = id => document.getElementById(id);
  const makeId = () => "ri-" + Date.now() + "-" + Math.random().toString(16).slice(2,7);
  const wordCount = text => (text.trim().match(/\S+/g) || []).length;
  function blank() { return {id:makeId(),title:"",body:"",category:"Memori",status:"Draft",slides:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; }
  function open(id) {
    const item = id ? Storage.get(id) : blank();
    if (!item) return;
    currentId = item.id;
    $("titleInput").value = item.title || "";
    $("bodyInput").value = item.body || "";
    $("categoryInput").value = item.category || "Memori";
    $("editorStatus").textContent = (item.status || "Draft").toUpperCase();
    $("finishWorkBtn").textContent = item.status === "Selesai" ? "Tandai sebagai draft" : "Tandai selesai";
    $("updatedAt").textContent = item.updatedAt ? "Diperbarui " + new Date(item.updatedAt).toLocaleDateString("id-ID") : "Draft baru";
    updatePreview();
    if (!id) { Storage.save(item); }
    App.showView("editor");
  }
  function collect() {
    const old = Storage.get(currentId) || blank();
    return {...old,id:currentId,title:$("titleInput").value.trim(),body:$("bodyInput").value,category:$("categoryInput").value};
  }
  function save(showToast=false) {
    if (!currentId) return;
    const item = collect();
    Storage.save(item);
    $("autosaveLabel").textContent = "Tersimpan " + new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
    $("editorStatus").textContent = item.status.toUpperCase();
    $("updatedAt").textContent = "Diperbarui " + new Date(item.updatedAt).toLocaleDateString("id-ID");
    App.refresh();
    if(showToast) App.toast("Tulisan berhasil disimpan.");
  }
  function updatePreview() {
    const title = $("titleInput").value.trim();
    const body = $("bodyInput").value;
    $("previewTitle").textContent = title || "Judul tulisanmu";
    $("previewBody").textContent = body || "Tulisanmu akan muncul di sini. Berikan ruang bagi pikiranmu untuk mengalir.";
    $("previewCategory").textContent = $("categoryInput").value.toUpperCase();
    $("wordCount").textContent = wordCount(body) + " kata";
  }
  function scheduleSave() {
    updatePreview();
    $("autosaveLabel").textContent = "Menyimpan...";
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => save(), 450);
  }
  function finish() {
    const item = collect();
    if (!item.title && !item.body.trim()) { App.toast("Tulis sesuatu terlebih dahulu."); return; }
    item.status = item.status === "Selesai" ? "Draft" : "Selesai";
    Storage.save(item);
    $("editorStatus").textContent = item.status.toUpperCase();
    $("finishWorkBtn").textContent = item.status === "Selesai" ? "Tandai sebagai draft" : "Tandai selesai";
    App.refresh(); App.toast(item.status === "Selesai" ? "Tulisan ditandai selesai." : "Tulisan dikembalikan ke draft.");
  }
  function remove() {
    if (!currentId || !confirm("Hapus tulisan ini? Tindakan ini tidak bisa dibatalkan.")) return;
    Storage.remove(currentId); currentId = null; App.showView("all"); App.refresh(); App.toast("Tulisan dihapus.");
  }
  function current() { return currentId ? Storage.get(currentId) : null; }
  function init() {
    ["titleInput","bodyInput","categoryInput"].forEach(id => $(id).addEventListener("input", scheduleSave));
    $("finishWorkBtn").addEventListener("click",finish);
    $("deleteWorkBtn").addEventListener("click",remove);
    $("openSlidesFromEditor").addEventListener("click",()=>{save(); App.openSlides(currentId);});
    $("backToList").addEventListener("click",()=>{save();App.showView("all");});
  }
  return {init,open,save,current};
})();
