"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function AnimatedHero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["organize", "excel", "master", "conquer", "achieve"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full relative overflow-hidden">
      <div className="container mx-auto">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-xs md:text-sm font-semibold text-violet-400 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full">
              ✨ The Student OS
            </span>
          </motion.div>

          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-7xl max-w-3xl tracking-tighter text-center font-black leading-tight">
              <span className="text-white">Master Your Semester,</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1 min-h-[80px]">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-400"
                    initial={{ opacity: 0, y: 100 }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
              <span className="text-white"> Your Future</span>
            </h1>

            <motion.p
              className="text-lg md:text-xl leading-relaxed tracking-tight text-slate-300 max-w-2xl text-center mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              One unified dashboard for schedules, grades, tasks, and materials.
              Everything you need to succeed, completely free.
            </motion.p>
          </div>

          <motion.div
            className="flex flex-row gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <button className="group relative px-8 py-3 md:px-10 md:py-4 text-base md:text-lg font-bold rounded-lg overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/50 hover:shadow-violet-600/80 transition-all duration-300 hover:scale-105 active:scale-95">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2 inline-block group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-3 md:px-10 md:py-4 text-base md:text-lg font-bold rounded-lg border-2 border-white/20 text-white hover:bg-white/5 hover:border-white/40 transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-sm">
              Learn More
            </button>
          </motion.div>
        </div>
      </div>

      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    </div>
  );
}
