"use client";

import { useEffect, useState } from "react";
import { appwriteConfig, fetchAllDocuments, Query } from "@/lib/appwrite";
import { formatInr, parseMenuItems, type MenuItem } from "@/lib/menu";

type FormState = {
  documentId: string;
  name: string;
  price: string;
  description: string;
  categoryId: string;
};

const emptyForm: FormState = {
  documentId: "",
  name: "",
  price: "",
  description: "",
  categoryId: "",
};

async function readJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

export default function MasterMenuLive({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("Loading menu...");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  async function loadMenu() {
    setMessage("Loading menu...");
    try {
      const docs = await fetchAllDocuments(appwriteConfig.collections.menuItems, {
        pageSize: 100,
        maxDocs: 300,
        queries: [Query.equal("client_id", [clientId])],
      });
      setItems(parseMenuItems(docs, clientId).sort((a, b) => a.name.localeCompare(b.name)));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load menu.");
    }
  }

  useEffect(() => {
    void loadMenu();
  }, [clientId]);

  async function saveItem() {
    if (!form.name.trim()) {
      setMessage("Item name is required.");
      return;
    }

    setSaving(true);
    setMessage("Saving menu item...");
    try {
      let imagePayload: Record<string, string> = {};
      if (imageFile) {
        const fd = new FormData();
        fd.append("image", imageFile);
        fd.append("clientId", clientId);
        fd.append("itemId", form.documentId || form.name);
        const uploadRes = await fetch("/api/master/menu-image", { method: "POST", body: fd });
        const uploadData = await readJsonSafe(uploadRes) as Record<string, string>;
        if (!uploadRes.ok) throw new Error(uploadData.message || "Menu image upload failed.");
        imagePayload = {
          imageFileId: uploadData.imageFileId || uploadData.fileId,
          imageBucketId: uploadData.imageBucketId || uploadData.bucketId,
          imageUrl: uploadData.imageUrl,
        };
      }

      const method = form.documentId ? "PATCH" : "POST";
      const res = await fetch("/api/master/menu-items", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: form.documentId || undefined,
          clientId,
          name: form.name,
          price: Number(form.price || 0),
          description: form.description,
          categoryId: form.categoryId,
          ...imagePayload,
        }),
      });

      const data = await readJsonSafe(res) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Menu save failed.");

      setForm(emptyForm);
      setImageFile(null);
      await loadMenu();
      setMessage("Menu item saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Menu save failed.");
    } finally {
      setSaving(false);
    }
  }

  function editItem(item: MenuItem) {
    setForm({
      documentId: item.id,
      name: item.name,
      price: String(item.price || ""),
      description: "",
      categoryId: "",
    });
  }

  return (
    <div className="mt-5 grid gap-4">
      <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 md:grid-cols-2">
        <input className="rounded-2xl bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="rounded-2xl bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input className="rounded-2xl bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Category ID optional" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} />
        <input className="rounded-2xl bg-white/10 px-4 py-3 text-sm outline-none" placeholder="Description optional" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input type="file" accept="image/png,image/jpeg,image/webp" className="rounded-2xl bg-white/10 px-4 py-3 text-sm outline-none" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
        <button onClick={saveItem} disabled={saving} className="rounded-2xl bg-[#86B9B0] px-4 py-3 text-sm font-semibold text-[#041421] disabled:opacity-50">{saving ? "Saving..." : form.documentId ? "Update Item" : "Add Item"}</button>
        <button onClick={() => setForm(emptyForm)} className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/80">Clear</button>
      </div>

      {message ? <p className="text-sm text-white/60">{message}</p> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-white/10 bg-white/10 p-4">
            {item.image ? <img src={item.image} alt={item.name} className="mb-3 h-36 w-full rounded-2xl object-cover" /> : null}
            <h3 className="font-semibold">{item.name}</h3>
            <p className="mt-2 text-sm font-semibold text-[#86B9B0]">{formatInr(item.price)}</p>
            <button onClick={() => editItem(item)} className="mt-3 rounded-2xl bg-white/10 px-4 py-2 text-sm text-white/80">Edit</button>
          </article>
        ))}
      </div>
      {!message && items.length === 0 ? <p className="text-sm text-white/60">No menu items found for this client.</p> : null}
    </div>
  );
}
