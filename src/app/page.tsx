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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 max-w-5xl mx-auto">
            {/* Card 1 */}
            <div className="bg-card-bg/60 backdrop-blur-xl rounded-3xl shadow-xl border border-card-border/50 overflow-hidden hover:-translate-y-1.5 transition-all duration-300 flex flex-col group">
              <div className="relative h-48 w-full overflow-hidden border-b border-card-border/40">
                <img 
                  src="/images/safe_loving.png" 
                  alt="Safe & Loving Sunday School"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute top-4 right-4 w-10 h-10 bg-card-bg/90 border border-card-border/80 rounded-xl flex items-center justify-center shadow-md">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between text-left">
                <div>
                  <h3 className="text-xl font-extrabold text-text-primary mb-2">Safe & Loving</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">A nurturing environment where every child is cherished, guided, and protected.</p>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-card-bg/60 backdrop-blur-xl rounded-3xl shadow-xl border border-card-border/50 overflow-hidden hover:-translate-y-1.5 transition-all duration-300 flex flex-col group">
              <div className="relative h-48 w-full overflow-hidden border-b border-card-border/40">
                <img 
                  src="/images/fun_activities.png" 
                  alt="Fun Activities"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute top-4 right-4 w-10 h-10 bg-card-bg/90 border border-card-border/80 rounded-xl flex items-center justify-center shadow-md">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between text-left">
                <div>
                  <h3 className="text-xl font-extrabold text-text-primary mb-2">Fun Activities</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">Engaging lessons, crafts, and games designed specifically to make faith enjoyable.</p>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-card-bg/60 backdrop-blur-xl rounded-3xl shadow-xl border border-card-border/50 overflow-hidden hover:-translate-y-1.5 transition-all duration-300 flex flex-col group">
              <div className="relative h-48 w-full overflow-hidden border-b border-card-border/40">
                <img 
                  src="/images/community.png" 
                  alt="Community"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute top-4 right-4 w-10 h-10 bg-card-bg/90 border border-card-border/80 rounded-xl flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5 text-indigo-500" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between text-left">
                <div>
                  <h3 className="text-xl font-extrabold text-text-primary mb-2">Community</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">Building lifelong friendships and a supportive network for spiritual growth.</p>
                </div>
              </div>
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
