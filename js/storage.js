const STORAGE_KEY = "ruang-ingatan-v1";
const Storage = {
  getAll() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (error) { console.error("Gagal membaca arsip:", error); return []; }
  },
  saveAll(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); return true; }
    catch (error) { alert("Penyimpanan browser penuh atau tidak tersedia. Coba ekspor tulisanmu."); return false; }
  },
  save(item) {
    const items = this.getAll();
    const index = items.findIndex(entry => entry.id === item.id);
    item.updatedAt = new Date().toISOString();
    if (index >= 0) items[index] = item;
    else items.unshift(item);
    return this.saveAll(items);
  },
  remove(id) { return this.saveAll(this.getAll().filter(item => item.id !== id)); },
  get(id) { return this.getAll().find(item => item.id === id) || null; }
};
