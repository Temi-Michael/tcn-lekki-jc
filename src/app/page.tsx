import Link from "next/link";
import { Heart, Star, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
          <span className="text-2xl font-bold text-indigo-950 tracking-tight">TCN Lekki</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 font-medium text-sm mb-4">
            <Star className="w-4 h-4 fill-indigo-700" /> Welcome to Our Family
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-800 to-purple-600 tracking-tight pb-2">
            Growing in Faith,<br />Together.
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Register your kids and teens for our upcoming events, summer camps, and Sunday school programs. 
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-5xl mx-auto">
            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-indigo-100/50 border border-white hover:-translate-y-1 transition-transform">
              <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Heart className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-indigo-950 mb-3">Safe & Loving</h3>
              <p className="text-slate-600">A nurturing environment where every child is cherished and protected.</p>
            </div>

            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-indigo-100/50 border border-white hover:-translate-y-1 transition-transform">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Star className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-indigo-950 mb-3">Fun Activities</h3>
              <p className="text-slate-600">Engaging lessons and joyful games designed specifically for their age group.</p>
            </div>

            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-indigo-100/50 border border-white hover:-translate-y-1 transition-transform">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-indigo-950 mb-3">Community</h3>
              <p className="text-slate-600">Building lifelong friendships rooted in spiritual growth and kindness.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full text-center py-8 text-slate-500 text-sm font-medium">
        <p>© {new Date().getFullYear()} TCN Lekki. All rights reserved.</p>
      </footer>
    </div>
  );
}
