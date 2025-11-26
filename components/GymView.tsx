
import React, { useState } from 'react';
import { GymViewType, FoodItem, WorkoutSession, WaterLog, GymSettings, WorkoutRoutine, ExerciseDefinition } from '../types';
import { GymDashboard } from './gym/GymDashboard';
import { GymWorkoutLogger } from './gym/GymWorkoutLogger';
import { GymNutritionLogger } from './gym/GymNutritionLogger';
import { GymSettingsComponent } from './gym/GymSettings';
import { GymNavigation } from './gym/GymNavigation';
import { styles } from '../theme';
import { DEFAULT_EXERCISES } from '../constants';

interface GymViewProps {
  onBack: () => void;
  // Data passed from App.tsx (Synced)
  foodLogs: FoodItem[];
  waterLogs: WaterLog[];
  workoutSessions: WorkoutSession[];
  routines: WorkoutRoutine[];
  customExercises: ExerciseDefinition[];
  settings: GymSettings;
  // Handlers
  addFoodLog: (item: FoodItem) => void;
  updateFoodLog: (item: FoodItem) => void;
  deleteFoodLog: (id: string) => void;
  addWaterLog: (amount: number) => void;
  addWorkoutSession: (session: WorkoutSession) => void;
  saveRoutine: (routine: WorkoutRoutine) => void;
  deleteRoutine: (id: string) => void;
  addCustomExercise: (ex: ExerciseDefinition) => void;
  updateSettings: (newSettings: GymSettings) => void;
}

const GymView: React.FC<GymViewProps> = ({ 
    onBack, 
    foodLogs, 
    waterLogs, 
    workoutSessions, 
    routines, 
    customExercises, 
    settings,
    addFoodLog,
    updateFoodLog,
    deleteFoodLog,
    addWaterLog,
    addWorkoutSession,
    saveRoutine,
    deleteRoutine,
    addCustomExercise,
    updateSettings
}) => {
  const [currentView, setCurrentView] = useState<GymViewType>(GymViewType.DASHBOARD);
  
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
