
import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, ArrowRight, Sparkles, GraduationCap, 
  Calendar, Calculator, Dumbbell, Brain, Link,
  Layout, Shield, Smartphone, Users, Star, CheckSquare, Crown
} from 'lucide-react';
import { RainbowButton } from './ui/rainbow-button';
import { GlowingCard } from './ui/glowing-card';
import { Banner } from './ui/Banner';
import ReferralTermsModal from './ReferralTermsModal';

interface LandingPageProps {
  onGetStarted: () => void;
  onShowReferral: () => void;
}

interface RevealProps {
  children?: React.ReactNode;
  className?: string;
  delay?: number;
}

// Scroll Reveal Component
const Reveal: React.FC<RevealProps> = ({ children, className = "", delay = 0 }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    
    if (ref.current) observer.observe(ref.current);
    
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, []);

  return (
    <div 
      ref={ref} 
      className={`${className} transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`} 
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onShowReferral }) => {
  const pricingRef = React.useRef<HTMLDivElement>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [hasDismissedBanner, setHasDismissedBanner] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  
  // Pricing Toggle State
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  // Scroll to top on mount and center pricing
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Center the pricing scroll view on mobile after a short delay to ensure rendering
    if (pricingRef.current) {
        setTimeout(() => {
            if (pricingRef.current) {
                const scrollLeft = (pricingRef.current.scrollWidth - pricingRef.current.clientWidth) / 2;
                pricingRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }, 500);
    }
  }, []);

  // Scroll Listener for Banner
  useEffect(() => {
    const handleScroll = () => {
      if (hasDismissedBanner) return;
      if (!pricingRef.current) return;

      const rect = pricingRef.current.getBoundingClientRect();
      
      // Trigger when the BOTTOM of the pricing section enters the viewport (user has scrolled past it)
      if (rect.bottom < window.innerHeight) {
        setShowBanner(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasDismissedBanner]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden selection:bg-violet-500/30 font-sans">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-8 py-3 md:py-5 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
        <div className="flex items-center gap-2 md:gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/20 group-hover:scale-110 transition-transform duration-300">
            <GraduationCap size={18} className="text-white md:w-5 md:h-5" />
          </div>
          <span className="font-bold text-base md:text-xl tracking-tight group-hover:text-violet-400 transition-colors">UniMate</span>
        </div>
        <button 
          onClick={onGetStarted}
          className="px-4 py-2 md:px-6 md:py-2.5 text-xs md:text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all hover:scale-105 active:scale-95 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-28 pb-12 md:pt-48 md:pb-24 px-5 md:px-20 flex flex-col items-center text-center">
        {/* Ambient Background */}
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[600px] bg-violet-600/20 rounded-full blur-[80px] md:blur-[120px] pointer-events-none animate-pulse-slow" />
        
        <Reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6 md:mb-8 hover:bg-violet-500/20 transition-colors cursor-default backdrop-blur-md">
                <Sparkles size={10} className="text-violet-400 animate-pulse md:w-3 md:h-3" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-violet-200">AI-Powered Student OS</span>
            </div>
        </Reveal>

        <Reveal delay={0.1}>
            <h1 className="text-4xl sm:text-5xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40 mb-4 md:mb-8 leading-[1.1] md:leading-tight max-w-5xl mx-auto tracking-tight">
              Master Your <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400">University Life.</span>
            </h1>
        </Reveal>
        
        <Reveal delay={0.2}>
            <p className="text-sm md:text-xl text-slate-400 max-w-xl md:max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed font-medium px-2">
              The all-in-one productivity hub designed for students. Organize classes, track grades, log workouts, and manage your time with Gemini AI.
            </p>
        </Reveal>
        
        <Reveal delay={0.3}>
            {/* Buttons - Stacked on Mobile, Row on Desktop */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-md mx-auto px-4 sm:px-0 mb-6">
              <div className="w-full hover:scale-105 transition-transform duration-300">
                  <RainbowButton onClick={onGetStarted} className="w-full h-14 px-8 text-lg rounded-2xl">
                    Get Started <ArrowRight size={20} className="ml-2" />
                  </RainbowButton>
              </div>
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:flex-1 h-14 px-8 bg-white/5 text-white font-bold rounded-2xl text-lg hover:bg-white/10 border border-white/10 transition-all hover:scale-105 active:scale-95 whitespace-nowrap flex items-center justify-center"
              >
                Learn More
              </button>
            </div>

            {/* Trial Info */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs md:text-sm text-slate-400 font-medium mb-8">
                <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> 14-day free trial</span>
                <span className="hidden md:inline text-slate-600">•</span>
                <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> No credit card required</span>
            </div>
        </Reveal>

        {/* Reviews */}
        <Reveal delay={0.4} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm shadow-xl">
             <div className="flex -space-x-3">
                {[12, 23, 45, 32].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0a0a0f] overflow-hidden bg-slate-800">
                        <img src={`https://i.pravatar.cc/100?img=${i}`} alt="User" className="w-full h-full object-cover" />
                    </div>
                ))}
            </div>
            <div className="flex flex-col items-start">
                <div className="flex gap-0.5 text-yellow-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={12} fill="currentColor" />
                    ))}
                </div>
                <p className="text-[10px] text-slate-300 font-medium"><span className="text-white font-bold">4.9/5</span> from 2k+ students</p>
            </div>
        </Reveal>

        {/* Mock UI Container */}
        <Reveal delay={0.5} className="w-full mt-16 md:mt-24">
            <div className="max-w-6xl mx-auto relative group px-2 md:px-0">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent z-10" />
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="bg-[#130f1c] border border-white/10 rounded-xl md:rounded-2xl p-1.5 md:p-2 shadow-2xl relative overflow-hidden">
                    <div className="bg-[#0f0f16] rounded-lg md:rounded-xl border border-white/5 aspect-[16/9] md:aspect-[21/9] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-500/5" />
                        
                        {/* Abstract UI representation */}
                        <div className="grid grid-cols-12 gap-3 md:gap-6 p-3 md:p-8 w-full h-full opacity-80 scale-[0.85] md:scale-95 group-hover:scale-90 md:group-hover:scale-100 transition-transform duration-700 origin-center">
                            {/* Sidebar */}
                            <div className="hidden md:block col-span-2 bg-white/5 rounded-2xl border border-white/5 h-full animate-pulse-slow" />
                            
                            {/* Main Content */}
                            <div className="col-span-12 md:col-span-10 flex flex-col gap-3 md:gap-6">
                                {/* Header */}
                                <div className="h-10 md:h-16 bg-white/5 rounded-xl md:rounded-2xl border border-white/5 w-full flex items-center px-4 md:px-6 gap-3 md:gap-4">
                                    <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-white/10"></div>
                                    <div className="h-1.5 md:h-2 w-20 md:w-32 bg-white/10 rounded-full"></div>
                                </div>
                                
                                {/* Grid */}
                                <div className="flex-1 grid grid-cols-3 gap-3 md:gap-6">
                                    <div className="col-span-2 flex flex-col gap-3 md:gap-6">
                                        <div className="flex-1 bg-white/5 rounded-xl md:rounded-2xl border border-white/5 relative overflow-hidden">
                                            <div className="absolute top-3 left-3 right-3 md:top-4 md:left-4 md:right-4 h-2 md:h-4 bg-white/10 rounded-full w-1/3"></div>
                                            <div className="absolute top-8 md:top-12 left-3 md:left-4 right-3 md:right-4 bottom-3 md:bottom-4 grid grid-cols-4 gap-2">
                                                {[...Array(8)].map((_, i) => (
                                                    <div key={i} className="bg-white/5 rounded-lg"></div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="h-1/3 bg-white/5 rounded-xl md:rounded-2xl border border-white/5 flex gap-3 md:gap-4 p-3 md:p-4">
                                            <div className="flex-1 bg-white/5 rounded-lg md:rounded-xl"></div>
                                            <div className="flex-1 bg-white/5 rounded-lg md:rounded-xl"></div>
                                        </div>
                                    </div>
                                    <div className="col-span-1 bg-white/5 rounded-xl md:rounded-2xl border border-white/5 relative overflow-hidden">
                                         <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-violet-500/20 to-transparent"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-2 md:px-6 md:py-3 rounded-full text-[10px] md:text-sm font-mono text-white/90 shadow-2xl transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                Interactive Student Dashboard
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Reveal>
      </div>

      {/* Features Grid */}
      <section id="features" className="py-16 md:py-32 max-w-7xl mx-auto">
        <Reveal>
            <div className="text-center mb-8 md:mb-20 px-6">
                <h2 className="text-2xl md:text-5xl font-bold mb-3 md:mb-6">Everything You Need</h2>
                <p className="text-slate-400 text-xs md:text-lg max-w-2xl mx-auto">Replace your fragmented tools with one cohesive operating system.</p>
            </div>
        </Reveal>

        {/* 2-Column Grid on Mobile, 3-Column on Desktop. No Horizontal Scroll. */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 px-4 md:px-6">
            {[
                { icon: <Calendar className="text-violet-400 w-5 h-5 md:w-6 md:h-6" />, title: "Smart Scheduling", desc: "Liquid-smooth calendar. Handle recurring classes, holidays, and conflict detection." },
                { icon: <CheckSquare className="text-teal-400 w-5 h-5 md:w-6 md:h-6" />, title: "To-Do Command", desc: "Integrated task manager. Tag assignments to courses and never miss a deadline." },
                { icon: <Link className="text-pink-400 w-5 h-5 md:w-6 md:h-6" />, title: "Course Hub", desc: "Save YouTube playlists, syllabus files, and drive links for every subject." },
                { icon: <Brain className="text-indigo-400 w-5 h-5 md:w-6 md:h-6" />, title: "AI Tutor & Mock Exams", desc: "Gemini-powered. Generate mock quizzes from your notes and get instant answers." },
                { icon: <Calculator className="text-emerald-400 w-5 h-5 md:w-6 md:h-6" />, title: "Grade Calculator", desc: "Track GPA instantly. See exactly what you need to score on the final." },
                { icon: <Dumbbell className="text-blue-400 w-5 h-5 md:w-6 md:h-6" />, title: "Gym & Nutrition", desc: "Complete workout logger and macro tracker tailored for student lifestyles." },
            ].map((feature, i) => (
                <Reveal key={i} delay={i * 0.1} className="h-full">
                    <FeatureCard icon={feature.icon} title={feature.title} desc={feature.desc} />
                </Reveal>
            ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 md:py-32 bg-[#0f0f16] border-y border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
            <Reveal>
                <div className="text-center mb-8 md:mb-20 px-6">
                    <h2 className="text-2xl md:text-5xl font-bold mb-3 md:mb-6">Simple Pricing</h2>
                    <p className="text-slate-400 text-xs md:text-lg">Invest in your GPA for less than a coffee.</p>
                </div>
            </Reveal>

            {/* Mobile: Horizontal Scroll with Padding for Pop Effect */}
            <div ref={pricingRef} className="flex md:grid md:grid-cols-3 gap-3 md:gap-8 items-stretch overflow-x-auto md:overflow-visible snap-x snap-mandatory no-scrollbar py-10 px-5 md:px-6 -mx-0 md:mx-auto">
                
                {/* 1. Free Plan */}
                <Reveal delay={0} className="min-w-[280px] md:min-w-0 snap-center h-full flex flex-col">
                    <PricingCard 
                        title="Freshman"
                        price="$0"
                        period="Forever"
                        features={['Basic Schedule', 'Task Manager', 'Grade Calculator']}
                        cta="Get Started"
                        onAction={onGetStarted}
                        variant="freshman"
                        className="h-full"
                    />
                </Reveal>

                {/* 2. Scholar Pro (Toggle) */}
                <Reveal delay={0.2} className="min-w-[280px] md:min-w-0 snap-center h-full flex flex-col">
                    <PricingCard 
                        title="Scholar Pro"
                        price={billingCycle === 'yearly' ? "$49" : "$5.99"}
                        period={billingCycle === 'yearly' ? "/year" : "/mo"}
                        features={['Everything in Free', 'Gemini AI Tutor', 'Gym & Macro Tracker', 'Cloud Storage', 'Priority Support']}
                        cta={billingCycle === 'yearly' ? "Get Yearly" : "Get Monthly"}
                        variant="pro"
                        onAction={onGetStarted}
                        toggle={true}
                        billingCycle={billingCycle}
                        setBillingCycle={setBillingCycle}
                        savingsText={billingCycle === 'yearly' ? "SAVE 32% YEARLY" : undefined}
                        trialText="Includes 14-day free trial"
                        className="h-full"
                    />
                </Reveal>

                {/* 3. Lifetime Plan */}
                <Reveal delay={0.4} className="min-w-[280px] md:min-w-0 snap-center h-full flex flex-col">
                    <PricingCard 
                        title="Lifetime"
                        price="$79"
                        period="one-time"
                        features={['All Pro Features', 'Lifetime Updates', 'No Recurring Fees', 'Founders Badge']}
                        cta="Buy Once"
                        onAction={onGetStarted}
                        savingsText="SAVE 75% FOREVER"
                        shinyButton={true}
                        variant="lifetime"
                        className="h-full"
                    />
                </Reveal>
                <div className="w-2 md:hidden shrink-0"></div> 
            </div>

            {/* Support Message */}
            <Reveal delay={0.6}>
                <div className="mt-8 md:mt-12 flex justify-center px-4">
                    <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm text-xs text-slate-400 max-w-lg text-center leading-relaxed hover:bg-white/10 transition-colors cursor-default">
                        <Smartphone size={16} className="shrink-0 text-violet-400" />
                        <span>
                            Your subscription supports server costs & AI fees, helping us bring the <span className="text-white font-semibold">Official Mobile App</span> to stores.
                        </span>
                    </div>
                </div>
            </Reveal>
        </div>
      </section>

      {/* CTA Section - REDESIGNED */}
      <section className="py-20 md:py-32 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-violet-600/5 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
          
          <Reveal>
              <div className="max-w-4xl mx-auto relative z-10">
                  <div className="relative bg-[#0f0f12] border border-white/10 rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-16 text-center overflow-hidden shadow-2xl group">
                      
                      {/* Animated Border Gradient */}
                      <div className="absolute inset-0 rounded-[2.5rem] md:rounded-[3.5rem] p-[1px] bg-gradient-to-b from-white/10 via-transparent to-white/10 pointer-events-none"></div>
                      
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
                      
                      {/* Floating Decorative Elements */}
                      <div className="absolute top-10 left-10 hidden md:flex items-center gap-2 bg-white/5 border border-white/5 rounded-full px-3 py-1.5 animate-float" style={{animationDelay: '0s'}}>
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">GPA 4.0</span>
                      </div>
                      <div className="absolute bottom-10 right-10 hidden md:flex items-center gap-2 bg-white/5 border border-white/5 rounded-full px-3 py-1.5 animate-float" style={{animationDelay: '1.5s'}}>
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                          <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Productivity 100%</span>
                      </div>

                      <div className="relative z-20 flex flex-col items-center">
                          
                          {/* Trust Badge */}
                          <div className="flex items-center gap-2 mb-6">
                              <div className="flex -space-x-2">
                                  {[1,2,3].map(i => (
                                      <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-[#0f0f12] flex items-center justify-center">
                                          <Users size={10} className="text-white/50" />
                                      </div>
                                  ))}
                              </div>
                              <span className="text-xs text-slate-400 font-medium">Join 10,000+ Students</span>
                          </div>

                          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 text-white tracking-tight leading-[1.1]">
                              Ready to <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 animate-gradient-x">Ace</span> <br className="hidden md:block"/> This Semester?
                          </h2>
                          
                          <p className="text-sm md:text-lg text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
                              Stop juggling multiple apps. Get the all-in-one student OS that handles your schedule, grades, and goals.
                          </p>
                          
                          <div className="relative group/btn">
                              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-40 group-hover/btn:opacity-75 transition duration-500"></div>
                              <RainbowButton onClick={onGetStarted} className="w-full sm:w-auto h-14 md:h-16 px-10 text-lg md:text-xl rounded-2xl relative">
                                  Start For Free <ArrowRight size={20} className="ml-2 inline-block group-hover/btn:translate-x-1 transition-transform" />
                              </RainbowButton>
                          </div>
                          
                          <div className="mt-8 flex items-center gap-6 text-[10px] md:text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> No credit card</span>
                              <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-500" /> Free tier forever</span>
                          </div>
                      </div>
                  </div>
              </div>
          </Reveal>
      </section>

      <Banner 
        show={showBanner}
        title="Refer & Earn Cash"
        action={{ label: "Get Code", onClick: onShowReferral }}
        onHide={() => { setShowBanner(false); setHasDismissedBanner(true); }}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 md:py-12 bg-[#050508] text-center relative z-10 px-6">
        <div className="flex items-center justify-center gap-3 mb-6 md:mb-8">
           <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/20">
             <GraduationCap size={18} className="text-white md:w-5 md:h-5" />
           </div>
           <span className="font-bold text-lg md:text-2xl text-white tracking-tight">UniMate</span>
        </div>
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-[10px] md:text-sm text-slate-500 mb-6 md:mb-8 font-medium">
            <a href="#" className="hover:text-white transition-colors hover:underline decoration-violet-500 decoration-2 underline-offset-4">Features</a>
            <a href="#" className="hover:text-white transition-colors hover:underline decoration-violet-500 decoration-2 underline-offset-4">Pricing</a>
            <button onClick={() => setShowTerms(true)} className="hover:text-white transition-colors hover:underline decoration-violet-500 decoration-2 underline-offset-4 bg-transparent border-none p-0 cursor-pointer">Referral Terms</button>
            <a href="#" className="hover:text-white transition-colors hover:underline decoration-violet-500 decoration-2 underline-offset-4">Privacy</a>
        </div>
        <p className="text-[10px] md:text-xs text-slate-600">&copy; {new Date().getFullYear()} UniMate. Built for students, by students.</p>
      </footer>

      <ReferralTermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, className = "" }: { icon: React.ReactNode, title: string, desc: string, className?: string }) => (
    <GlowingCard className={`h-full rounded-[24px] md:rounded-[40px] ${className}`}>
        <div className="bg-[#130f1c]/90 backdrop-blur-xl h-full p-4 md:p-8 flex flex-col relative rounded-[inherit] border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-shadow duration-500">
            <div className="mb-3 md:mb-6 bg-white/5 w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-300 group-hover:bg-white/10 text-white shrink-0">
                {icon}
            </div>
            <h3 className="text-sm md:text-xl font-bold mb-2 md:mb-3 text-white group-hover:text-violet-300 transition-colors line-clamp-2 md:line-clamp-none">{title}</h3>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed flex-1">{desc}</p>
        </div>
    </GlowingCard>
);

interface PricingCardProps {
    title: string;
    price: string;
    period: string;
    features: string[];
    cta: string;
    variant?: 'freshman' | 'pro' | 'lifetime';
    highlighted?: boolean;
    onAction: () => void;
    className?: string;
    toggle?: boolean;
    billingCycle?: 'monthly' | 'yearly';
    setBillingCycle?: (val: 'monthly' | 'yearly') => void;
    savingsText?: string;
    trialText?: string;
    shinyButton?: boolean;
}

const PricingCard = ({ 
    title, price, period, features, cta, variant = 'freshman', highlighted = false, onAction, className = "",
    toggle = false, billingCycle, setBillingCycle, savingsText, trialText, shinyButton = false 
}: PricingCardProps) => {
    
    // Variant Styles
    const isPro = variant === 'pro';
    const isLifetime = variant === 'lifetime';
    
    let bgClass = "bg-[#130f1c]/90";
    let borderClass = "border border-white/10";
    let titleColor = "text-slate-300";
    let checkColor = "bg-slate-700 text-slate-400";
    let btnClass = "bg-white/10 hover:bg-white/20 text-white";

    if (isPro) {
        bgClass = "bg-gradient-to-b from-violet-900/20 to-[#130f1c]/90";
        borderClass = "border border-violet-500/30";
        titleColor = "text-violet-300";
        checkColor = "bg-violet-500/20 text-violet-400";
        btnClass = "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/20";
    }

    if (isLifetime) {
        bgClass = "bg-gradient-to-b from-amber-950/40 via-[#1a1500] to-[#0a0a0f]";
        borderClass = "border border-amber-500/30";
        titleColor = "text-amber-200";
        checkColor = "bg-amber-500/20 text-amber-400 border border-amber-500/20";
        btnClass = "bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 text-black shadow-lg shadow-amber-400/20 bg-[length:200%_100%] animate-rainbow";
    }

    return (
    <GlowingCard className={`h-full rounded-[40px] ${isPro ? 'z-10 scale-100 md:scale-105 shadow-2xl' : ''} ${className}`}>
        {/* Floating Badges (Outside clipped content) */}
        {isPro && (
            <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[9px] md:text-xs font-bold px-3 py-1 md:px-4 md:py-1.5 rounded-full uppercase tracking-wider shadow-lg whitespace-nowrap z-20">
                Most Popular
            </div>
        )}

        {isLifetime && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-600 text-black text-[9px] md:text-xs font-bold px-3 py-1 md:px-4 md:py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-amber-500/20 whitespace-nowrap z-20 flex items-center gap-1.5 border border-white/20">
                <Crown size={12} fill="currentColor" /> Founders Edition
            </div>
        )}

        {/* Main Content with Overflow Hidden to Fix Glitch */}
        <div className={`h-full p-6 md:p-8 flex flex-col relative rounded-[inherit] backdrop-blur-xl shadow-[0_0_20px_rgba(255,255,255,0.03)] overflow-hidden ${bgClass} ${borderClass}`}>
            
            {/* Visual Flair for Lifetime */}
            {isLifetime && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-500/10 blur-[40px] rounded-full"></div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                </div>
            )}

            {toggle && setBillingCycle && (
                <div className="flex justify-center mb-6">
                    <div className="bg-white/5 p-1 rounded-xl flex items-center border border-white/5 relative">
                        <div 
                            className={`absolute top-1 bottom-1 w-[50%] bg-indigo-600 rounded-lg transition-all duration-300 ${billingCycle === 'yearly' ? 'left-[48%]' : 'left-1'}`}
                        ></div>
                        <button 
                            onClick={() => setBillingCycle('monthly')}
                            className={`relative z-10 px-3 py-1 text-[10px] md:text-xs font-bold rounded-lg transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            Monthly
                        </button>
                        <button 
                            onClick={() => setBillingCycle('yearly')}
                            className={`relative z-10 px-3 py-1 text-[10px] md:text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${billingCycle === 'yearly' ? 'text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            Yearly
                        </button>
                    </div>
                </div>
            )}

            <h3 className={`text-base md:text-xl font-bold mb-2 ${titleColor}`}>{title}</h3>
            
            <div className="mb-1 flex items-baseline gap-1 relative z-10">
                <span className={`text-3xl md:text-5xl font-black tracking-tight ${isLifetime ? 'text-amber-100' : 'text-white'}`}>{price}</span>
                <span className={`text-xs md:text-base font-medium ${isLifetime ? 'text-amber-200/50' : 'text-slate-500'}`}>{period}</span>
            </div>

            {/* Savings Text */}
            <div className="min-h-[24px] mb-4 md:mb-6 relative z-10">
                {savingsText && (
                    <span className={`inline-block text-[10px] md:text-xs font-bold px-2 py-0.5 rounded border ${
                        isLifetime 
                            ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' 
                            : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                    }`}>
                        {savingsText}
                    </span>
                )}
            </div>

            <ul className="space-y-2 md:space-y-4 mb-6 md:mb-8 flex-1 relative z-10">
                {features.map((feat: string, i: number) => (
                    <li key={i} className={`flex items-start gap-2 md:gap-3 text-xs md:text-sm ${isLifetime ? 'text-amber-100/80' : 'text-slate-300'}`}>
                        <div className={`mt-0.5 rounded-full p-0.5 shrink-0 ${checkColor}`}>
                            <Check size={10} className="md:w-3 md:h-3" strokeWidth={3} />
                        </div>
                        {feat}
                    </li>
                ))}
            </ul>
            
            <div className="min-h-[20px] mb-3">
                {trialText && (
                    <div className="text-center text-[10px] md:text-xs text-emerald-400 font-bold animate-pulse">
                        {trialText}
                    </div>
                )}
            </div>

            <button 
                onClick={onAction}
                className={`w-full py-3.5 md:py-4 rounded-xl font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 text-xs md:text-sm relative z-10 ${btnClass}`}
            >
                {cta}
            </button>
        </div>
    </GlowingCard>
)};

export default LandingPage;
