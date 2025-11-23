import React from "react";

// --- iOS 26 Liquid Glass Theme - Visual Design System ---

export const theme = {
  bgGradient: "radial-gradient(circle at 50% -20%, #1e0a45 0%, #000000 60%, #000000 100%)", // Deep Void with Violet undertone
  cardBg: "rgba(30, 30, 40, 0.6)", // Higher opacity for readability
  cardBorder: "1px solid rgba(255, 255, 255, 0.1)",
  glassBorder: "1px solid rgba(255, 255, 255, 0.1)",
  text: "#FFFFFF",
  textMuted: "rgba(255, 255, 255, 0.6)", 
  accent: "#8b5cf6", // Violet Accent
  accentGlow: "0 0 25px rgba(139, 92, 246, 0.2)",
  success: "#34d399",
  danger: "#f87171",
  warning: "#fbbf24"
};

export const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    background: "#000",
    backgroundImage: theme.bgGradient,
    color: theme.text,
    overflow: "hidden",
    position: "relative"
  },
  // Floating Navigation Pill
  bottomNav: {
    position: "absolute",
    bottom: "30px",
    left: "50%",
    transform: "translateX(-50%)",
    height: "65px",
    background: "linear-gradient(135deg, rgba(30, 10, 60, 0.9), rgba(50, 20, 90, 0.9))", // More vibrant gradient
    backdropFilter: "blur(20px)", 
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "35px",
    border: "1px solid rgba(139, 92, 246, 0.3)", 
    boxShadow: "0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
    display: "flex",
    justifyContent: "space-evenly",
    alignItems: "center",
    zIndex: 1000,
    width: "90%",
    maxWidth: "400px",
    padding: "0 10px"
  },
  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    color: "rgba(255, 255, 255, 0.5)",
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    position: "relative"
  },
  activeNavItem: {
    color: "#fff",
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    boxShadow: "0 0 15px rgba(139, 92, 246, 0.3)",
    transform: "scale(1.05)"
  },
  main: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    maxWidth: "600px", 
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box"
  },
  scrollableContent: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 20px 120px 20px",
    WebkitOverflowScrolling: "touch",
  },
  header: {
    marginBottom: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "10px"
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
    color: "#fff",
    letterSpacing: "-0.8px",
    margin: 0,
    textShadow: "0 2px 10px rgba(0,0,0,0.3)"
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: "0.95rem",
    marginTop: "4px",
    fontWeight: 500,
  },
  card: {
    backgroundColor: theme.cardBg,
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    borderRadius: "24px",
    padding: "20px",
    border: theme.glassBorder,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    marginBottom: "16px",
    position: "relative",
    overflow: "hidden"
  },
  // Schedule Grid
  scheduleWrapper: {
    display: "flex",
    flex: 1,
    overflow: "auto",
    borderRadius: "24px",
    border: theme.glassBorder,
    backgroundColor: "rgba(20,20,30,0.4)", 
    WebkitOverflowScrolling: "touch",
    backdropFilter: "blur(30px)",
    maxHeight: "calc(100vh - 200px)", 
    position: 'relative'
  },
  scheduleContainer: {
    display: "grid",
    gridTemplateColumns: "60px 1fr 15px 1fr 15px 1fr 15px 1fr 15px 1fr", 
    backgroundColor: "transparent", 
    minWidth: "800px",
    position: "relative" 
  },
  scheduleHeaderCell: {
    backgroundColor: "rgba(10, 10, 15, 0.95)", // Almost opaque
    padding: "8px 4px",
    textAlign: "center",
    color: theme.text,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "50px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    position: "sticky",
    top: 0,
    zIndex: 20,
    backdropFilter: "blur(20px)"
  },
  scheduleBreakHeader: {
    backgroundColor: "rgba(10, 10, 15, 0.95)",
    writingMode: "vertical-rl",
    transform: "rotate(180deg)",
    textAlign: "center",
    color: theme.textMuted,
    fontSize: "0.6rem",
    padding: "2px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    letterSpacing: "1px",
    fontWeight: 700,
    textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    borderRight: "1px dashed rgba(255,255,255,0.08)",
    borderLeft: "1px dashed rgba(255,255,255,0.08)",
    position: "sticky",
    top: 0,
    zIndex: 20
  },
  scheduleDayCell: {
    backgroundColor: "rgba(10, 10, 15, 0.95)", // Almost opaque
    padding: "8px 4px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: 700,
    color: theme.text,
    fontSize: "0.75rem",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    borderRight: "1px solid rgba(255,255,255,0.1)",
    position: "sticky",
    left: 0,
    zIndex: 10,
    backdropFilter: "blur(20px)"
  },
  scheduleContentCell: {
    padding: "4px",
    minHeight: "80px", 
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "4px", 
    overflow: "hidden",
    transition: "background-color 0.2s",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    borderRight: "1px solid rgba(255,255,255,0.08)",
  },
  scheduleBreakCell: {
    backgroundColor: "transparent",
    backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 10px, transparent 10px, transparent 20px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    borderRight: "1px dashed rgba(255,255,255,0.08)",
    borderLeft: "1px dashed rgba(255,255,255,0.08)",
  },
  eventCard: {
    padding: "8px",
    borderRadius: "10px",
    fontSize: "0.75rem",
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between", // Ensure spacing between header, body, footer
    position: "relative",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)", 
    minHeight: "60px", // Increased min-height
    flex: 1,
    border: "none",
    zIndex: 5,
  },
  // UI Elements
  input: {
    flex: 1,
    padding: "14px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.1)",
    fontSize: "0.95rem",
    outline: "none",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "white",
    transition: "all 0.2s",
    backdropFilter: "blur(10px)"
  },
  button: {
    padding: "12px 18px",
    backgroundColor: theme.accent,
    color: "white",
    border: "none",
    borderRadius: "18px", 
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.9rem",
    boxShadow: theme.accentGlow,
  },
  secondaryButton: {
    padding: "12px 18px",
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "18px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backdropFilter: "blur(10px)"
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    padding: "14px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    gap: "14px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)", // Darker overlay
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
    padding: "20px"
  },
  modalContent: {
    backgroundColor: "#130f1c", // Solid background to prevent transparency issues
    borderRadius: "32px",
    padding: "28px",
    width: "100%",
    maxWidth: "400px", 
    maxHeight: "80vh",
    overflowY: "auto",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 40px 80px rgba(0,0,0,0.9)",
    animation: "scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    color: "#fff",
    display: "flex",
    flexDirection: "column"
  },
  formGroup: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  select: {
    width: "100%",
    padding: "14px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "white",
    fontSize: "0.95rem",
    outline: "none",
    appearance: "none",
  },
  dropZone: {
    border: "2px dashed rgba(255,255,255,0.15)",
    borderRadius: "24px",
    padding: "30px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  dateBadge: {
    fontSize: "0.65rem",
    color: theme.textMuted,
    marginTop: "4px",
    fontWeight: 500
  },
  colorPickerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    marginBottom: '8px',
  }
};