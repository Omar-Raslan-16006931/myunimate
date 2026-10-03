import React from "react";

// --- iOS 26 Liquid Glass Theme - Visual Design System ---

export const theme = {
  bgGradient: "var(--bg-gradient)",
  cardBg: "var(--card-bg)",
  cardBorder: "var(--card-border)",
  glassBorder: "var(--glass-border)",
  text: "var(--text-primary)",
  textMuted: "var(--text-muted)", 
  accent: "#8b5cf6", // Keeping Hex for JS logic usage, mapped to CSS var visual
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
    background: "var(--bg-gradient)", // Use var
    color: "var(--text-primary)", // Use var
    overflow: "hidden",
    position: "relative",
    transition: "background 0.5s ease",
    maxWidth: "800px",
    margin: "0 auto",
    boxShadow: "0 0 40px rgba(0,0,0,0.3)",
    borderLeft: "var(--glass-border)",
    borderRight: "var(--glass-border)",
  },
  // Floating Navigation Pill - Updated to Fixed Position
  bottomNav: {
    position: "fixed",
    bottom: "calc(30px + env(safe-area-inset-bottom))",
    left: "50%",
    transform: "translateX(-50%)",
    height: "65px",
    background: "var(--nav-bg)", // Use var
    backdropFilter: "blur(20px)", 
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "35px",
    border: "var(--glass-border)", // Use var
    boxShadow: "0 20px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
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
    color: "var(--text-muted)", // Use var
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    position: "relative"
  },
  activeNavItem: {
    color: "var(--text-primary)", // Use var
    backgroundColor: "var(--nav-active-bg)", // Use var
    boxShadow: "0 0 15px rgba(139, 92, 246, 0.3)",
    transform: "scale(1.05)"
  },
  // Main Content - Scaled Down ~10%
  main: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    maxWidth: "540px", 
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box"
  },
  scrollableContent: {
    flex: 1,
    overflowY: "auto",
    padding: "18px 18px 110px 18px", 
    WebkitOverflowScrolling: "touch",
  },
  header: {
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "8px" 
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 800,
    color: "var(--text-primary)", // Use var
    letterSpacing: "-0.8px",
    margin: 0,
    textShadow: "0 2px 10px rgba(0,0,0,0.1)"
  },
  subtitle: {
    color: "var(--text-muted)", // Use var
    fontSize: "0.85rem",
    marginTop: "3px",
    fontWeight: 500,
  },
  card: {
    backgroundColor: "var(--card-bg)", // Use var
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    borderRadius: "8px",
    padding: "18px",
    border: "var(--card-border)", // Use var
    boxShadow: "4px 5px 0 var(--ink)",
    marginBottom: "14px",
    position: "relative",
    overflow: "hidden",
    color: "var(--text-primary)",
    boxSizing: "border-box"
  },
  // Schedule Grid - Scaled Down
  scheduleWrapper: {
    display: "flex",
    flex: 1,
    overflow: "auto",
    borderRadius: "22px",
    border: "var(--glass-border)",
    backgroundColor: "rgba(20,20,30,0.05)", 
    WebkitOverflowScrolling: "touch",
    backdropFilter: "blur(30px)",
    maxHeight: "calc(100vh - 180px)", 
    position: 'relative'
  },
  scheduleContainer: {
    display: "grid",
    gridTemplateColumns: "54px 1fr 13px 1fr 13px 1fr 13px 1fr 13px 1fr", 
    backgroundColor: "transparent", 
    minWidth: "720px", 
    position: "relative" 
  },
  scheduleHeaderCell: {
    backgroundColor: "var(--schedule-header-bg)", // Use var
    padding: "7px 3px",
    textAlign: "center",
    color: "var(--text-primary)", // Use var
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "45px",
    borderBottom: "1px solid var(--schedule-grid-lines)", // Use var
    borderRight: "1px solid var(--schedule-grid-lines)", // Use var
    position: "sticky",
    top: 0,
    zIndex: 20,
    backdropFilter: "blur(20px)"
  },
  scheduleBreakHeader: {
    backgroundColor: "var(--schedule-header-bg)", // Use var
    writingMode: "vertical-rl",
    transform: "rotate(180deg)",
    textAlign: "center",
    color: "var(--text-muted)", // Use var
    fontSize: "0.55rem",
    padding: "2px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    letterSpacing: "1px",
    fontWeight: 700,
    textTransform: "uppercase",
    borderBottom: "1px solid var(--schedule-grid-lines)",
    borderRight: "1px dashed var(--schedule-grid-lines)",
    borderLeft: "1px dashed var(--schedule-grid-lines)",
    position: "sticky",
    top: 0,
    zIndex: 20
  },
  scheduleDayCell: {
    backgroundColor: "var(--schedule-header-bg)", // Use var
    padding: "7px 3px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: 700,
    color: "var(--text-primary)", // Use var
    fontSize: "0.7rem",
    borderBottom: "1px solid var(--schedule-grid-lines)",
    borderRight: "1px solid var(--schedule-grid-lines)",
    position: "sticky",
    left: 0,
    zIndex: 10,
    backdropFilter: "blur(20px)"
  },
  scheduleContentCell: {
    padding: "3px",
    minHeight: "72px",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    overflow: "hidden",
    transition: "background-color 0.2s",
    borderBottom: "1px solid var(--schedule-grid-lines)",
    borderRight: "1px solid var(--schedule-grid-lines)",
  },
  scheduleBreakCell: {
    backgroundColor: "transparent",
    backgroundImage: "repeating-linear-gradient(45deg, rgba(100,100,100,0.03), rgba(100,100,100,0.03) 10px, transparent 10px, transparent 20px)",
    borderBottom: "1px solid var(--schedule-grid-lines)",
    borderRight: "1px dashed var(--schedule-grid-lines)",
    borderLeft: "1px dashed var(--schedule-grid-lines)",
  },
  eventCard: {
    padding: "7px",
    borderRadius: "8px",
    fontSize: "0.7rem",
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between", 
    position: "relative",
    boxShadow: "2px 3px 0 var(--ink)", 
    minHeight: "54px",
    flex: 1,
    border: "1.5px solid var(--ink)",
    zIndex: 5,
  },
  // UI Elements - Scaled Down
  input: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "1.5px solid var(--ink)",
    fontSize: "0.85rem",
    outline: "none",
    backgroundColor: "var(--input-bg)", // Use var
    color: "var(--text-primary)", // Use var
    transition: "all 0.2s",
    backdropFilter: "blur(10px)",
    boxSizing: "border-box"
  },
  button: {
    padding: "10px 16px",
    backgroundColor: "var(--ink)",
    color: "white",
    border: "1.5px solid var(--ink)",
    borderRadius: "10px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "0.85rem",
    boxShadow: "4px 4px 0 var(--hl-yellow)",
  },
  secondaryButton: {
    padding: "10px 16px",
    backgroundColor: "var(--input-bg)",
    color: "var(--text-primary)",
    border: "1.5px solid var(--glass-border)",
    borderRadius: "10px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    backdropFilter: "blur(10px)"
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    padding: "12px",
    borderBottom: "1px solid var(--glass-border)",
    gap: "12px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)", 
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
    padding: "18px"
  },
  modalContent: {
    backgroundColor: "var(--modal-bg)", 
    borderRadius: "12px",
    padding: "24px",
    width: "100%",
    maxWidth: "360px",
    maxHeight: "80vh",
    overflowY: "auto",
    overflowX: "hidden",
    border: "1.5px solid var(--ink)",
    boxShadow: "6px 8px 0 var(--ink)",
    animation: "popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)", // Premium bezier curve
    color: "var(--text-primary)",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box"
  },
  formGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  select: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1.5px solid var(--ink)",
    backgroundColor: "var(--input-bg)",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    outline: "none",
    appearance: "none",
    boxSizing: "border-box"
  },
  dropZone: {
    border: "2px dashed var(--text-muted)",
    borderRadius: "22px",
    padding: "26px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    backgroundColor: "var(--input-bg)",
  },
  dateBadge: {
    fontSize: "0.6rem",
    color: "var(--text-muted)",
    marginTop: "3px",
    fontWeight: 500
  },
  colorPickerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: "9px",
    backgroundColor: "var(--input-bg)",
    borderRadius: "11px",
    marginBottom: "7px",
  }
};