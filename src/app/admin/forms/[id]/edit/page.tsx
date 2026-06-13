"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save, GripVertical } from "lucide-react";

type FieldType = "text" | "number" | "email" | "textarea" | "date" | "boolean" | "select";

export default function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("active");
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/admin/forms/${id}`)
      .then(res => res.json())
      .then(data => {
        setTitle(data.title);
        setSlug(data.slug);
        setStatus(data.status);
        const loadedFields = data.fields?.map((f: any) => ({
          ...f,
          optionsRaw: f.options ? f.options.join(", ") : ""
        })) || [];
        setFields(loadedFields);
        setLoading(false);
      })
      .catch(err => {
        setError("Failed to load form");
        setLoading(false);
      });
  }, [id]);

  const addField = () => {
    setFields([...fields, { name: "", label: "", type: "text", required: false }]);
  };

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    
    // Auto-generate name from label if name is empty and label changes
    if (key === "label" && !newFields[index].name) {
      newFields[index].name = value.toLowerCase().replace(/[^a-z0-9]/g, "_");
    }
    
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('opacity-50');
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newFields = [...fields];
    const draggedItem = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedItem);
    
    setFields(newFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    (e.target as HTMLElement).classList.remove('opacity-50');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const submitFields = fields.map(f => ({
        ...f,
        options: f.optionsRaw !== undefined ? f.optionsRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : f.options
      }));

      const res = await fetch(`/api/admin/forms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, status, fields: submitFields }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update form");

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Edit Form</h1>
          <p className="text-neutral-400 mt-1">Update your event form</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white">General Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Form Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="e.g. Summer Camp 2024"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">URL Slug (e.g. tcn-lekki.com/slug)</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                placeholder="summer-camp-24"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Form Fields</h2>
              <p className="text-sm text-neutral-400 mt-1">The default fields are required for duplicate checking.</p>
            </div>
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" /> Add Custom Field
            </button>
          </div>

          <div className="space-y-4">
            {/* Default Locked Fields */}
            <div className="flex flex-col gap-3 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">
                Default Included Fields
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-neutral-950/50 border border-neutral-800/50 rounded-lg p-3 text-neutral-300 text-sm flex items-center justify-between">
                  <span>First Name</span> <span className="text-xs text-neutral-500">Required</span>
                </div>
                <div className="bg-neutral-950/50 border border-neutral-800/50 rounded-lg p-3 text-neutral-300 text-sm flex items-center justify-between">
                  <span>Last Name</span> <span className="text-xs text-neutral-500">Required</span>
                </div>
                <div className="bg-neutral-950/50 border border-neutral-800/50 rounded-lg p-3 text-neutral-300 text-sm flex items-center justify-between">
                  <span>Age</span> <span className="text-xs text-neutral-500">Required</span>
                </div>
              </div>
            </div>

            {fields.map((field, index) => (
              <div 
                key={field.name || index} 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={handleDragEnd}
                className={`flex flex-col sm:flex-row items-start gap-4 p-4 bg-neutral-950 border border-neutral-800 rounded-xl relative group overflow-hidden transition-all ${draggedIndex === index ? 'border-blue-500 shadow-lg shadow-blue-500/20' : ''}`}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                
                <div className="flex items-center self-stretch sm:self-auto pt-1 sm:pt-6 cursor-grab active:cursor-grabbing text-neutral-600 hover:text-neutral-300 transition-colors">
                  <GripVertical className="w-5 h-5" />
                </div>

                <div className="flex-1 w-full flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 w-full">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Custom Field Label</label>
                      <input
                        type="text"
                        required
                        value={field.label}
                        onChange={(e) => updateField(index, "label", e.target.value)}
                        className="w-full bg-transparent border-b border-neutral-700 text-white px-0 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="e.g. Parent's Phone Number"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, "type", e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 text-sm"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="boolean">Yes/No</option>
                        <option value="select">Multiple Choice</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 flex items-center h-full sm:pt-5">
                      <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(index, "required", e.target.checked)}
                          className="rounded border-neutral-700 bg-neutral-900 text-blue-500 focus:ring-blue-500/20"
                        />
                        Required
                      </label>
                    </div>
                  </div>

                  {field.type === "select" && (
                    <div className="w-full">
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1 block">Options (comma-separated)</label>
                      <input
                        type="text"
                        value={field.optionsRaw ?? (field.options?.join(", ") || "")}
                        onChange={(e) => updateField(index, "optionsRaw", e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="e.g. Red, Blue, Green"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors sm:opacity-0 group-hover:opacity-100 sm:mt-5 self-end sm:self-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {fields.length === 0 && (
              <div className="text-center py-8 text-neutral-500 text-sm border border-dashed border-neutral-800 rounded-xl">
                No custom fields added. Click "Add Field" to add one.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
