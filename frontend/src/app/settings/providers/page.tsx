"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  getProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  setDefaultProvider,
  testProviderConnection,
  type LLMProvider,
  type LLMProviderCreate,
} from "@/lib/api";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [form, setForm] = useState<LLMProviderCreate>({
    name: "",
    display_name: "",
    provider_type: "ollama",
    base_url: "",
    model_name: "",
    api_key: "",
  });

  async function load() {
    try {
      const data = await getProviders();
      setProviders(data.items);
    } catch {
      showToast("Failed to load providers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function openCreate() {
    setEditingProvider(null);
    setForm({ name: "", display_name: "", provider_type: "ollama", base_url: "", model_name: "", api_key: "" });
    setDialogOpen(true);
  }

  function openEdit(p: LLMProvider) {
    setEditingProvider(p);
    setForm({ name: p.name, display_name: p.display_name, provider_type: p.provider_type, base_url: p.base_url, model_name: p.model_name, api_key: "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editingProvider) {
        await updateProvider(editingProvider.id, { display_name: form.display_name, base_url: form.base_url, model_name: form.model_name, ...(form.api_key ? { api_key: form.api_key } : {}) });
        showToast("Provider updated");
      } else {
        await createProvider(form);
        showToast("Provider created");
      }
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProvider(id);
      showToast("Provider deleted");
      load();
    } catch {
      showToast("Delete failed");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await setDefaultProvider(id);
      showToast("Default provider updated");
      load();
    } catch {
      showToast("Failed to set default");
    }
  }

  async function handleTest(id: string) {
    setTestResults((r) => ({ ...r, [id]: { success: false, message: "Testing…" } }));
    try {
      const result = await testProviderConnection(id);
      setTestResults((r) => ({ ...r, [id]: result }));
    } catch {
      setTestResults((r) => ({ ...r, [id]: { success: false, message: "Connection failed" } }));
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">LLM Providers</h1>
          <p className="text-sm text-muted-foreground">Manage AI translation providers</p>
        </div>
        <Button onClick={openCreate} className="bg-brand-cyan text-white hover:opacity-90">
          Add Provider
        </Button>
      </div>

      {loading && <p className="text-muted-foreground">Loading…</p>}

      {!loading && providers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No providers configured. Add one to get started.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {providers.map((p) => (
          <Card key={p.id} className={`border ${p.is_default ? "border-brand-cyan" : "border-border"}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{p.display_name}</CardTitle>
                  {p.is_default && <Badge className="bg-brand-cyan text-white text-xs">Default</Badge>}
                  {!p.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                </div>
                <Badge variant="outline" className="text-xs capitalize">{p.provider_type}</Badge>
              </div>
              <CardDescription className="text-xs">{p.model_name} · {p.base_url}</CardDescription>
            </CardHeader>
            <CardContent>
              {testResults[p.id] && (
                <p className={`text-xs mb-2 ${testResults[p.id].success ? "text-green-500" : "text-red-500"}`}>
                  {testResults[p.id].message}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => handleTest(p.id)}>Test Connection</Button>
                {!p.is_default && (
                  <Button size="sm" variant="outline" onClick={() => handleSetDefault(p.id)}>Set Default</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProvider ? "Edit Provider" : "Add Provider"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!editingProvider && (
              <>
                <div className="grid gap-1">
                  <Label>Name (unique identifier)</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ollama-local" />
                </div>
                <div className="grid gap-1">
                  <Label>Type</Label>
                  <Select value={form.provider_type} onChange={(e) => setForm((f) => ({ ...f, provider_type: e.target.value }))}>
                    <option value="ollama">Ollama</option>
                    <option value="openrouter">OpenRouter</option>
                  </Select>
                </div>
              </>
            )}
            <div className="grid gap-1">
              <Label>Display Name</Label>
              <Input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} placeholder="Ollama (Local)" />
            </div>
            <div className="grid gap-1">
              <Label>Base URL</Label>
              <Input value={form.base_url} onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))} placeholder="http://localhost:11434" />
            </div>
            <div className="grid gap-1">
              <Label>Model Name</Label>
              <Input value={form.model_name} onChange={(e) => setForm((f) => ({ ...f, model_name: e.target.value }))} placeholder="llama3.1" />
            </div>
            <div className="grid gap-1">
              <Label>API Key {editingProvider && "(leave blank to keep existing)"}</Label>
              <Input type="password" value={form.api_key ?? ""} onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))} placeholder="sk-..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-brand-cyan text-white hover:opacity-90" onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {toastMsg && (
        <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg px-4 py-2 text-sm shadow-lg text-foreground z-50">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
