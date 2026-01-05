
import React from 'react';
import { 
  Check, ArrowRight, Sparkles, GraduationCap, 
  Calendar, Calculator, Dumbbell, Brain, Zap,
  Layout, Shield, Smartphone
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  // Scroll to top on mount
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden selection:bg-violet-500/30">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/20">
            <GraduationCap size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">UniMate</span>
        </div>
        <button 
          onClick={onGetStarted}
          className="px-5 py-2 text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-all"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-6 md:px-20 flex flex-col items-center text-center">
        {/* Ambient Background */}
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[800px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-8 animate-fade-in-up">
            <Sparkles size={14} className="text-violet-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-200">AI-Powered Student OS</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 mb-6 leading-tight max-w-4xl mx-auto animate-fade-in-up" style={{animationDelay: '0.1s'}}>
          Master Your <br />
          University Life.
        </h1>
        
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          The all-in-one productivity hub designed for students. Organize classes, track grades, log workouts, and manage your time with Gemini AI.
        </p>
        
        <div className="flex flex-col md:flex-row gap-4 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
          <button 
            onClick={onGetStarted}
            className="px-8 py-4 bg-white text-black font-bold rounded-full text-lg hover:bg-slate-200 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] flex items-center gap-2"
          >
            Get Started Free <ArrowRight size={20} />
          </button>
          <button 
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-white/5 text-white font-bold rounded-full text-lg hover:bg-white/10 border border-white/10 transition-all"
          >
            Learn More
          </button>
        </div>

        {/* Mock UI Container */}
        <div className="mt-20 w-full max-w-5xl mx-auto relative animate-fade-in-up" style={{animationDelay: '0.5s'}}>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent z-10" />
            <div className="bg-[#130f1c] border border-white/10 rounded-2xl p-2 shadow-2xl">
                <div className="bg-[#0f0f16] rounded-xl border border-white/5 aspect-[16/9] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-indigo-500/10" />
                    {/* Abstract UI representation */}
                    <div className="grid grid-cols-12 gap-4 p-8 w-full h-full opacity-80">
                        <div className="col-span-3 bg-white/5 rounded-xl border border-white/5 h-full animate-pulse-slow" />
                        <div className="col-span-9 flex flex-col gap-4">
                            <div className="h-1/3 flex gap-4">
                                <div className="flex-1 bg-white/5 rounded-xl border border-white/5" />
                                <div className="flex-1 bg-white/5 rounded-xl border border-white/5" />
                                <div className="flex-1 bg-white/5 rounded-xl border border-white/5" />
                            </div>
                            <div className="flex-1 bg-white/5 rounded-xl border border-white/5" />
                        </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-sm font-mono text-white/70">
                            Interactive Dashboard Preview
                        </span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 md:px-20 max-w-7xl mx-auto">
        <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything You Need</h2>
            <p className="text-slate-400">Replace your calendar, notes app, gym tracker, and calculator.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
                icon={<Calendar className="text-violet-400" />}
                title="Smart Scheduling"
                desc="Visualize your week with a liquid-smooth calendar that handles recurring classes and breaks."
            />
            <FeatureCard 
                icon={<Brain className="text-indigo-400" />}
                title="AI Assistant"
                desc="Powered by Gemini. Ask about your schedule, generate study plans, or summarize notes."
            />
            <FeatureCard 
                icon={<Calculator className="text-emerald-400" />}
                title="Grade Tracking"
                desc="Calculate your GPA instantly and see exactly what you need to score to hit your targets."
            />
            <FeatureCard 
                icon={<Dumbbell className="text-blue-400" />}
                title="Gym & Nutrition"
                desc="Built-in workout logger and macro tracker tailored for students on the go."
            />
            <FeatureCard 
                icon={<Layout className="text-pink-400" />}
                title="Files Manager"
                desc="Keep your syllabus, assignments, and slides organized by course."
            />
            <FeatureCard 
                icon={<Shield className="text-orange-400" />}
                title="Private & Secure"
                desc="Your data is yours. Row Level Security ensures only you access your academic life."
            />
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6 md:px-20 bg-[#0f0f16] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple Pricing</h2>
                <p className="text-slate-400">Invest in your GPA for less than a coffee.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-center">
                {/* Free Tier */}
                <PricingCard 
                    title="Freshman"
                    price="$0"
                    period="/mo"
                    features={['Course Scheduling', 'Basic Task Management', 'Grade Calculator', 'File Storage (500MB)']}
                    cta="Start Free"
                    onAction={onGetStarted}
                />

                {/* Pro Tier */}
                <PricingCard 
                    title="Scholar"
                    price="$3.99"
                    period="/mo"
                    features={['Everything in Free', 'Gemini AI Assistant', 'Gym & Macro Tracker', 'Unlimited Storage', 'Priority Support']}
                    cta="Go Pro"
                    highlighted
                    onAction={onGetStarted}
                />

                {/* Lifetime */}
                <PricingCard 
                    title="Lifetime"
                    price="$49"
                    period="/once"
                    features={['All Pro Features', 'Lifetime Updates', 'Early Access Features', 'Exclusive Themes', 'No Monthly Fees']}
                    cta="Buy Once"
                    onAction={onGetStarted}
                />
            </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Ace This Semester?</h2>
              <p className="text-slate-400 mb-10 text-lg">Join thousands of students organizing their academic life with UniMate.</p>
              <button 
                onClick={onGetStarted}
                className="px-10 py-5 bg-white text-black font-bold rounded-full text-xl hover:bg-slate-200 transition-all shadow-[0_0_50px_-15px_rgba(255,255,255,0.4)]"
              >
                Join Now - It's Free
              </button>
          </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-[#050508] text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
           <GraduationCap size={24} className="text-violet-500" />
           <span className="font-bold text-xl text-white">UniMate</span>
        </div>
        <div className="flex justify-center gap-8 text-sm text-slate-500 mb-8">
            <a href="#" className="hover:text-white transition-colors">Features</a>
            <a href="#" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
        </div>
        <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} UniMate. Built for students, by students.</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:bg-white/10 transition-colors">
        <div className="mb-4 bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center border border-white/5">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
);

const PricingCard = ({ title, price, period, features, cta, highlighted = false, onAction }: any) => (
    <div className={`relative p-8 rounded-3xl border ${highlighted ? 'bg-violet-900/20 border-violet-500/50 shadow-2xl shadow-violet-900/20' : 'bg-white/5 border-white/10'}`}>
        {highlighted && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
            </div>
        )}
        <h3 className={`text-xl font-bold mb-2 ${highlighted ? 'text-violet-300' : 'text-slate-300'}`}>{title}</h3>
        <div className="mb-6 flex items-baseline gap-1">
            <span className="text-4xl font-bold">{price}</span>
            <span className="text-slate-500">{period}</span>
        </div>
        <ul className="space-y-4 mb-8">
            {features.map((feat: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check size={16} className={highlighted ? 'text-violet-400' : 'text-slate-500'} />
                    {feat}
                </li>
            ))}
        </ul>
        <button 
            onClick={onAction}
            className={`w-full py-3 rounded-xl font-bold transition-colors ${
                highlighted 
                ? 'bg-violet-600 hover:bg-violet-500 text-white' 
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
        >
            {cta}
        </button>
    </div>
);

export default LandingPage;
