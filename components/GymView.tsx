
import React, { useState, useEffect } from 'react';
import { GymViewType, FoodItem, WorkoutSession, WaterLog, GymSettings, WorkoutRoutine, ExerciseDefinition } from '../types';
import { DEFAULT_GYM_SETTINGS, DEFAULT_ROUTINES, DEFAULT_EXERCISES } from '../constants';
import { GymDashboard } from './gym/GymDashboard';
import { GymWorkoutLogger } from './gym/GymWorkoutLogger';
import { GymNutritionLogger } from './gym/GymNutritionLogger';
import { GymSettingsComponent } from './gym/GymSettings';
import { GymNavigation } from './gym/GymNavigation';
import { styles } from '../theme';

interface GymViewProps {
  onBack: () => void;
}

const GymView: React.FC<GymViewProps> = ({ onBack }) => {
  const [currentView, setCurrentView] = useState<GymViewType>(GymViewType.DASHBOARD);
  
  // --- Data Initialization ---
  const [foodLogs, setFoodLogs] = useState<FoodItem[]>(() => {
    const saved = localStorage.getItem('gym-foodLogs');
    return saved ? JSON.parse(saved) : [];
  });

  const [waterLogs, setWaterLogs] = useState<WaterLog[]>(() => {
    const saved = localStorage.getItem('gym-waterLogs');
    return saved ? JSON.parse(saved) : [];
  });

  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>(() => {
    const saved = localStorage.getItem('gym-workoutSessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [routines, setRoutines] = useState<WorkoutRoutine[]>(() => {
    const saved = localStorage.getItem('gym-workoutRoutines');
    return saved ? JSON.parse(saved) : DEFAULT_ROUTINES;
  });

  const [customExercises, setCustomExercises] = useState<ExerciseDefinition[]>(() => {
    const saved = localStorage.getItem('gym-customExercises');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<GymSettings>(() => {
    const saved = localStorage.getItem('gym-userSettings');
    return saved ? JSON.parse(saved) : DEFAULT_GYM_SETTINGS;
  });

  // --- Persistence ---
  useEffect(() => { localStorage.setItem('gym-foodLogs', JSON.stringify(foodLogs)); }, [foodLogs]);
  useEffect(() => { localStorage.setItem('gym-waterLogs', JSON.stringify(waterLogs)); }, [waterLogs]);
  useEffect(() => { localStorage.setItem('gym-workoutSessions', JSON.stringify(workoutSessions)); }, [workoutSessions]);
  useEffect(() => { localStorage.setItem('gym-workoutRoutines', JSON.stringify(routines)); }, [routines]);
  useEffect(() => { localStorage.setItem('gym-customExercises', JSON.stringify(customExercises)); }, [customExercises]);
  useEffect(() => { localStorage.setItem('gym-userSettings', JSON.stringify(settings)); }, [settings]);

  // --- Handlers ---
  const addFoodLog = (item: FoodItem) => setFoodLogs(prev => [...prev, item]);
  const updateFoodLog = (updatedItem: FoodItem) => setFoodLogs(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  const deleteFoodLog = (id: string) => setFoodLogs(prev => prev.filter(item => item.id !== id));
  const addWaterLog = (amount: number) => setWaterLogs(prev => [...prev, { id: Date.now().toString(), amount, timestamp: Date.now() }]);

  const addWorkoutSession = (session: WorkoutSession) => {
    setWorkoutSessions(prev => [session, ...prev]); 
    if (session.routineId) {
        setRoutines(prev => prev.map(r => r.id === session.routineId ? { ...r, lastPerformed: Date.now() } : r));
    }
  };
  
  const saveRoutine = (routine: WorkoutRoutine) => {
      setRoutines(prev => {
          const exists = prev.find(r => r.id === routine.id);
          if (exists) return prev.map(r => r.id === routine.id ? routine : r);
          return [...prev, routine];
      });
  };

  const deleteRoutine = (id: string) => setRoutines(prev => prev.filter(r => r.id !== id));
  const addCustomExercise = (ex: ExerciseDefinition) => setCustomExercises(prev => [...prev, ex]);
  const updateSettings = (newSettings: GymSettings) => setSettings(newSettings);

  const allExercises = [...DEFAULT_EXERCISES, ...customExercises];
  const today = new Date().setHours(0,0,0,0);
  const todaysFood = foodLogs.filter(item => item.timestamp >= today);
  const todaysWater = waterLogs.filter(item => item.timestamp >= today);

  const renderView = () => {
    switch (currentView) {
      case GymViewType.DASHBOARD:
        return <GymDashboard foodLogs={todaysFood} waterLogs={todaysWater} workoutSessions={workoutSessions} settings={settings} setView={setCurrentView} />;
      case GymViewType.WORKOUT:
        return <GymWorkoutLogger history={workoutSessions} routines={routines} exercises={allExercises} saveWorkout={addWorkoutSession} saveRoutine={saveRoutine} deleteRoutine={deleteRoutine} addCustomExercise={addCustomExercise} settings={settings} />;
      case GymViewType.NUTRITION:
        return <GymNutritionLogger logs={todaysFood} waterLogs={todaysWater} addLog={addFoodLog} updateLog={updateFoodLog} deleteLog={deleteFoodLog} addWater={addWaterLog} settings={settings} />;
      case GymViewType.SETTINGS:
        return <GymSettingsComponent settings={settings} updateSettings={updateSettings} />;
      default:
        return null;
    }
  };

  return (
    <div style={styles.scrollableContent}>
        {renderView()}
        <GymNavigation currentView={currentView} setView={setCurrentView} onExit={onBack} />
    </div>
  );
};

export default GymView;
