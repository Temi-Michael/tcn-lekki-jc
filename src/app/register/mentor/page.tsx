"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ArrowLeft, Loader2, CheckCircle2, Heart, Award, Copy, Check } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function MentorRegistrationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [weddingAnniversary, setWeddingAnniversary] = useState("");
  const [address, setAddress] = useState("");
  const [profession, setProfession] = useState("");
  const [company, setCompany] = useState("");
  const [subunit, setSubunit] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !dob || !address.trim() || !profession.trim() || !company.trim() || !subunit) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/mentors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          dob,
          weddingAnniversary: weddingAnniversary || undefined,
          address: address.trim(),
          profession: profession.trim(),
          company: company.trim(),
          subunit,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center flex flex-col items-center gap-6 animate-scale-in">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
          
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/25 animate-pulse mt-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Registration Complete!</h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Thank you, <strong className="text-white">{firstName} {lastName}</strong>, for signing up to serve. You are now registered in the Sunday School database.
            </p>
          </div>

          <div className="w-full bg-slate-950 border border-slate-850 p-4 rounded-2xl text-left text-xs text-slate-400 leading-relaxed">
            <p className="font-semibold text-white mb-1 uppercase tracking-wider text-[10px]">What&apos;s Next?</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Every Sunday, search for your name on the Mentors Kiosk to check in.</li>
              <li>Your sub-unit is set as <strong className="text-indigo-400">{subunit}</strong>.</li>
              <li>Please reach out to the Sunday School admin if you need to modify your records.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 w-full mt-2">
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              Back to Home
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setFirstName("");
                setLastName("");
                setPhone("");
                setEmail("");
                setDob("");
                setWeddingAnniversary("");
                setAddress("");
                setProfession("");
                setCompany("");
                setSubunit("");
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Register Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden w-full">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-rose-500/10 rounded-full filter blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full bg-slate-900/60 border-b border-slate-850 px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
          <span className="text-lg font-bold text-white tracking-tight">TCN Lekki Junior Church</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 relative z-10">
        <div className="bg-slate-900/60 border border-slate-850 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Mentor Biodata Form</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              Thank you for volunteering to serve. Please fill in your profile details to register in our Sunday School portal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* Category 1: Basic Information */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-bold text-indigo-400 tracking-wider border-b border-slate-800 pb-2">
                1. Basic Info
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">First Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm"
                    placeholder="e.g. Kelechi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Last Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm"
                    placeholder="e.g. Okafor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Phone Number (WhatsApp) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm"
                    placeholder="e.g. +234 803 111 2222"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm"
                    placeholder="e.g. name@tcnlekki.org"
                  />
                </div>
              </div>
            </div>

            {/* Category 2: Personal Dates */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs uppercase font-bold text-indigo-400 tracking-wider border-b border-slate-800 pb-2">
                2. Key Dates
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Date of Birth <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-white rounded-xl px-4 py-3 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Wedding Anniversary</label>
                  <input
                    type="date"
                    value={weddingAnniversary}
                    onChange={(e) => setWeddingAnniversary(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-white rounded-xl px-4 py-3 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Category 3: Residential and Professional */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs uppercase font-bold text-indigo-400 tracking-wider border-b border-slate-800 pb-2">
                3. Residence & Profession
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Residential Address <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-655 text-sm"
                  placeholder="Please state your full residential address..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Profession / Occupation <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm"
                    placeholder="e.g. Product Designer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Company <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 text-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-600 text-sm"
                    placeholder="e.g. Paystack"
                  />
                </div>
              </div>
            </div>

            {/* Category 4: Serving subunit */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs uppercase font-bold text-indigo-400 tracking-wider border-b border-slate-800 pb-2">
                4. Tribe & Service
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  What sub-unit would you like to serve in Jesus Tribe? <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    "Ministration",
                    "Finance",
                    "Admin / Operations",
                    "Publicity",
                    "Bible Study",
                    "Prayer",
                    "Welfare",
                    "Editorial"
                  ].map((dept) => (
                    <label
                      key={dept}
                      className={`flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-3.5 rounded-xl border transition-all ${
                        subunit === dept
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 font-semibold"
                          : "bg-slate-950 border-slate-850 hover:bg-slate-850"
                      }`}
                    >
                      <input
                        type="radio"
                        name="subunit"
                        required
                        checked={subunit === dept}
                        onChange={() => setSubunit(dept)}
                        className="text-indigo-600 focus:ring-indigo-500 shrink-0"
                      />
                      <span className="truncate">{dept}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 cursor-pointer text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Registering...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" /> Submit Registration
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-6 text-slate-500 text-xs mt-auto">
        <p>© {new Date().getFullYear()} TCN Lekki. All rights reserved.</p>
      </footer>
    </div>
  );
}
