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
          <span className="text-2xl font-bold text-indigo-950 tracking-tight">TCN Junior Church</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 font-medium text-sm mb-4">
            <Star className="w-4 h-4 fill-indigo-700" /> Junior Church · Ages 10–16
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-800 to-purple-600 tracking-tight pb-2">
            Growing in Faith,<br />Together.
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A community for pre-teens and teens (ages 10–16) to grow in faith, build real friendships, and discover their purpose. Register for our programs, events, and camps.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 max-w-5xl mx-auto">
            {/* Card 1 */}
            <div className="bg-card-bg/60 backdrop-blur-xl rounded-3xl shadow-xl border border-card-border/50 overflow-hidden hover:-translate-y-1.5 transition-all duration-300 flex flex-col group">
              <div className="relative h-48 w-full overflow-hidden border-b border-card-border/40">
                <img 
                  src="/images/safe_loving.png"
                  alt="Faith that sticks"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute top-4 right-4 w-10 h-10 bg-card-bg/90 border border-card-border/80 rounded-xl flex items-center justify-center shadow-md">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between text-left">
                <div>
                  <h3 className="text-xl font-extrabold text-text-primary mb-2">Faith That Sticks</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">Honest teaching and real conversations about God, life, and the questions that actually matter to you.</p>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-card-bg/60 backdrop-blur-xl rounded-3xl shadow-xl border border-card-border/50 overflow-hidden hover:-translate-y-1.5 transition-all duration-300 flex flex-col group">
              <div className="relative h-48 w-full overflow-hidden border-b border-card-border/40">
                <img 
                  src="/images/fun_activities.png"
                  alt="More than Sundays"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute top-4 right-4 w-10 h-10 bg-card-bg/90 border border-card-border/80 rounded-xl flex items-center justify-center shadow-md">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between text-left">
                <div>
                  <h3 className="text-xl font-extrabold text-text-primary mb-2">More Than Sundays</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">Hangouts, camps, and challenges that make growing in faith something you actually look forward to.</p>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-card-bg/60 backdrop-blur-xl rounded-3xl shadow-xl border border-card-border/50 overflow-hidden hover:-translate-y-1.5 transition-all duration-300 flex flex-col group">
              <div className="relative h-48 w-full overflow-hidden border-b border-card-border/40">
                <img 
                  src="/images/community.png"
                  alt="Your crew"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute top-4 right-4 w-10 h-10 bg-card-bg/90 border border-card-border/80 rounded-xl flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5 text-indigo-500" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between text-left">
                <div>
                  <h3 className="text-xl font-extrabold text-text-primary mb-2">Your Crew</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">Friends and mentors who have your back as you grow, serve, and discover your God-given gifts.</p>
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
