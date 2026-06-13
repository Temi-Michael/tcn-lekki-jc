"use client";

import { useEffect, useState, use } from "react";
import { AlertCircle, CheckCircle2, Heart, Lock } from "lucide-react";
import { notFound } from "next/navigation";

export default function PublicForm({ params }: { params: Promise<{ formSlug: string }> }) {
  // We use React's use() to unwrap the promise in Next 15
  const unwrappedParams = use(params);
  const { formSlug } = unwrappedParams;

  const [formConfig, setFormConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [customData, setCustomData] = useState<Record<string, any>>({});

  // Duplicate Check State
  const [duplicateLevel, setDuplicateLevel] = useState(0); // 0=none, 1=first match, 2=first+last match, 3=exact match
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    fetch(`/api/forms/${formSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setFormConfig(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [formSlug]);

  useEffect(() => {
    if (!formConfig) return;
    
    const timer = setTimeout(() => {
      if (firstName.trim().length > 2) {
        setIsChecking(true);
        fetch("/api/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formId: formConfig._id,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            age: age === "" ? undefined : age,
          }),
        })
          .then((res) => res.json())
          .then((data) => setDuplicateLevel(data.level || 0))
          .finally(() => setIsChecking(false));
      } else {
        setDuplicateLevel(0);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [firstName, lastName, age, formConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateLevel === 3) {
      const confirmSubmit = window.confirm(
        "We found a similar name. Are you sure you want to submit?"
      );
      if (!confirmSubmit) return;
    }

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: formConfig._id,
          firstName,
          lastName,
          age,
          data: customData,
          isDuplicateSuspected: duplicateLevel >= 2,
        }),
      });

      if (!res.ok) throw new Error("Submission failed");
      setSuccess(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (error === "Form not found") {
    notFound();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-500">Loading form...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (formConfig.status === "disabled") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-[2rem] shadow-2xl text-center max-w-md w-full relative overflow-hidden border border-slate-100">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Registration Closed</h2>
        <p className="text-slate-500 leading-relaxed mb-8">
          The registration for <span className="font-semibold text-slate-700">{formConfig.title}</span> is currently closed. If you believe this is a mistake, please contact the administrators.
        </p>
      </div>
    </div>
  );
  if (success) return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-indigo-950 mb-2">Thank You!</h2>
        <p className="text-slate-600">Your registration for {formConfig.title} was successful.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-white">
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-[-50%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <Heart className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white tracking-tight">{formConfig.title}</h1>
          <p className="text-indigo-100 mt-2">Please fill out the details below carefully.</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Standard Fields */}
            <div className="space-y-4 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50">
              <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider mb-4">Child's Primary Info</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="e.g. Ayobami"
                />
                {duplicateLevel === 1 && (
                  <p className="text-amber-600 text-sm mt-2 flex items-center gap-1 animate-pulse">
                    <AlertCircle className="w-4 h-4 shrink-0" /> Are you sure you haven't filled this before?
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="e.g. Sanmi"
                />
                {duplicateLevel === 2 && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" /> Seems you have filled this form!
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value))}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="e.g. 12"
                />
                {duplicateLevel === 3 && (
                  <p className="text-red-600 text-sm mt-2 flex items-start sm:items-center gap-1 font-bold bg-red-100 p-3 rounded-lg border border-red-200">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" /> You definitely have filled this form before! 
                  </p>
                )}
              </div>
            </div>

            {/* Custom Fields */}
            {formConfig.fields.length > 0 && (
              <div className="space-y-4">
                <hr className="border-slate-100 my-6" />
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Additional Details</h3>
                
                {formConfig.fields.map((field: any) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {field.type === "textarea" ? (
                      <textarea
                        required={field.required}
                        value={customData[field.name] || ""}
                        onChange={(e) => setCustomData({...customData, [field.name]: e.target.value})}
                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px] placeholder:text-slate-400"
                      />
                    ) : field.type === "boolean" ? (
                       <select
                        required={field.required}
                        value={customData[field.name] || ""}
                        onChange={(e) => setCustomData({...customData, [field.name]: e.target.value})}
                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      >
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : field.type === "number" ? (
                      <input
                        type="number"
                        required={field.required}
                        value={customData[field.name] || ""}
                        onChange={(e) => setCustomData({...customData, [field.name]: e.target.value})}
                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-slate-400"
                      />
                    ) : field.type === "select" ? (
                      <select
                        required={field.required}
                        value={customData[field.name] || ""}
                        onChange={(e) => setCustomData({...customData, [field.name]: e.target.value})}
                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      >
                        <option value="">Select an option...</option>
                        {field.options?.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        required={field.required}
                        value={customData[field.name] || ""}
                        onChange={(e) => setCustomData({...customData, [field.name]: e.target.value})}
                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={isChecking}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all flex justify-center items-center gap-2 ${
                duplicateLevel === 3 
                  ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" 
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
              }`}
            >
              {isChecking ? "Checking..." : duplicateLevel === 3 ? "Submit Anyway (Needs Review)" : "Complete Registration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
