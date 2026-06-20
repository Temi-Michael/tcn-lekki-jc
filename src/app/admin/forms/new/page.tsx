"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Settings, Type, Calendar, Phone, ToggleLeft, AlignLeft, Hash, List, GripVertical } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

type FieldType = "text" | "textarea" | "number" | "date" | "boolean" | "email" | "select";

interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  optionsRaw?: string;
}

export default function CreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("disabled");
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addField = (type: FieldType) => {
    setFields([
      ...fields,
      { name: `field_${Date.now()}`, label: "", type, required: false, options: [], optionsRaw: "" }
    ]);
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

  const updateField = (index: number, key: keyof FormField, value: any) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    // Auto-generate name from label if name is just the default timestamp
    if (key === "label" && newFields[index].name.startsWith("field_")) {
        newFields[index].name = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    setFields(newFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const submitFields = fields.map(f => ({
        ...f,
        options: f.optionsRaw ? f.optionsRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : f.options
      }));

      const res = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, status, fields: submitFields }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create form");
      }

      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (type: FieldType) => {
    switch (type) {
      case "text": return <Type className="w-4 h-4" />;
      case "textarea": return <AlignLeft className="w-4 h-4" />;
      case "number": return <Hash className="w-4 h-4" />;
      case "date": return <Calendar className="w-4 h-4" />;
      case "boolean": return <ToggleLeft className="w-4 h-4" />;
      case "email": return <Type className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Create New Form</h1>
          <p className="text-neutral-400 mt-2">Design your form. First Name, Last Name, and Age are automatically included.</p>
        </div>
        <ThemeToggle />
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            General Settings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="disabled">Disabled (Hidden)</option>
                <option value="active">Active (Public)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Form Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="e.g. Summer Camp 2026"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Custom Link (/your-link)</label>
              <div className="flex">
                <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-neutral-800 bg-neutral-950 text-neutral-500 text-sm">
                  /
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-r-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="summer-camp"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Custom Fields */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Custom Fields</h2>
          
          <div className="space-y-4 mb-6">
            {fields.length === 0 && (
              <div className="text-center py-8 border border-dashed border-neutral-800 rounded-xl text-neutral-500">
                No custom fields added yet. Choose from below.
              </div>
            )}

            {fields.map((field, index) => (
              <div 
                key={field.name} 
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
          </div>

          {/* Add buttons */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addField("text")} className="flex items-center gap-2 px-3 py-2 bg-neutral-950 border border-neutral-800 hover:border-blue-500/50 rounded-lg text-sm text-neutral-300 transition-colors">
              <Type className="w-4 h-4" /> Short Text
            </button>
            <button type="button" onClick={() => addField("textarea")} className="flex items-center gap-2 px-3 py-2 bg-neutral-950 border border-neutral-800 hover:border-blue-500/50 rounded-lg text-sm text-neutral-300 transition-colors">
              <AlignLeft className="w-4 h-4" /> Long Text
            </button>
            <button type="button" onClick={() => addField("number")} className="flex items-center gap-2 px-3 py-2 bg-neutral-950 border border-neutral-800 hover:border-blue-500/50 rounded-lg text-sm text-neutral-300 transition-colors">
              <Phone className="w-4 h-4" /> Number / Phone
            </button>
            <button type="button" onClick={() => addField("date")} className="flex items-center gap-2 px-3 py-2 bg-neutral-950 border border-neutral-800 hover:border-blue-500/50 rounded-lg text-sm text-neutral-300 transition-colors">
              <Calendar className="w-4 h-4" /> Date
            </button>
            <button type="button" onClick={() => addField("boolean")} className="flex items-center gap-2 px-3 py-2 bg-neutral-950 border border-neutral-800 hover:border-blue-500/50 rounded-lg text-sm text-neutral-300 transition-colors">
              <ToggleLeft className="w-4 h-4" /> Yes / No
            </button>
            <button type="button" onClick={() => addField("select")} className="flex items-center gap-2 px-3 py-2 bg-neutral-950 border border-neutral-800 hover:border-blue-500/50 rounded-lg text-sm text-neutral-300 transition-colors">
              <List className="w-4 h-4" /> Multiple Choice
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? "Creating..." : <><Plus className="w-5 h-5" /> Save Form</>}
          </button>
        </div>
      </form>
    </div>
  );
}
