import React, { useState } from 'react';
import { GymViewType, FoodItem, WorkoutSession, WaterLog, GymSettings, WorkoutRoutine, ExerciseDefinition, ActiveGymState, BodyLog } from '../types';
import { GymDashboard } from './gym/GymDashboard';
import { GymWorkoutLogger } from './gym/GymWorkoutLogger';
import { GymNutritionLogger } from './gym/GymNutritionLogger';
import { GymAnalysis } from './gym/GymAnalysis';
import { GymSettingsComponent } from './gym/GymSettings';
import { GymNavigation } from './gym/GymNavigation';
import { DEFAULT_EXERCISES } from '../constants';

interface GymViewProps {
  onBack: () => void;
  // Data passed from App.tsx (Synced)
  foodLogs: FoodItem[];
  waterLogs: WaterLog[];
  workoutSessions: WorkoutSession[];
  routines: WorkoutRoutine[];
  customExercises: ExerciseDefinition[];
  bodyLogs: BodyLog[];
  settings: GymSettings;
  activeGymState: ActiveGymState;
  onUpdateActiveGymState: (state: ActiveGymState) => void;
  // Handlers
  addFoodLog: (item: FoodItem) => void;
  updateFoodLog: (item: FoodItem) => void;
  deleteFoodLog: (id: string) => void;
  addWaterLog: (amount: number) => void;
  addWorkoutSession: (session: WorkoutSession) => void;
  deleteWorkoutSession: (id: string) => void;
  saveRoutine: (routine: WorkoutRoutine) => void;
  deleteRoutine: (id: string) => void;
  addCustomExercise: (ex: ExerciseDefinition) => void;
  addBodyLog: (log: BodyLog) => void;
  deleteBodyLog: (id: string) => void;
  updateSettings: (newSettings: GymSettings) => void;
}

const GymView: React.FC<GymViewProps> = ({
    onBack,
    foodLogs,
    waterLogs,
    workoutSessions,
    routines,
    customExercises,
    bodyLogs,
    settings,
    activeGymState,
    onUpdateActiveGymState,
    addFoodLog,
    updateFoodLog,
    deleteFoodLog,
    addWaterLog,
    addWorkoutSession,
    deleteWorkoutSession,
    saveRoutine,
    deleteRoutine,
    addCustomExercise,
    addBodyLog,
    deleteBodyLog,
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
        return <GymDashboard foodLogs={todaysFood} waterLogs={todaysWater} workoutSessions={workoutSessions} bodyLogs={bodyLogs} settings={settings} setView={setCurrentView} activeSession={activeGymState.session} />;
      case GymViewType.WORKOUT:
        return (
            <GymWorkoutLogger
                history={workoutSessions}
                routines={routines}
                exercises={allExercises}
                saveWorkout={addWorkoutSession}
                deleteWorkoutSession={deleteWorkoutSession}
                saveRoutine={saveRoutine}
                deleteRoutine={deleteRoutine}
                addCustomExercise={addCustomExercise}
                settings={settings}
                activeGymState={activeGymState}
                onUpdateActiveGymState={onUpdateActiveGymState}
            />
        );
      case GymViewType.NUTRITION:
        return <GymNutritionLogger logs={todaysFood} waterLogs={todaysWater} addLog={addFoodLog} updateLog={updateFoodLog} deleteLog={deleteFoodLog} addWater={addWaterLog} settings={settings} />;
      case GymViewType.ANALYSIS:
        return <GymAnalysis workoutSessions={workoutSessions} bodyLogs={bodyLogs} settings={settings} addBodyLog={addBodyLog} deleteBodyLog={deleteBodyLog} />;
      case GymViewType.SETTINGS:
        return <GymSettingsComponent settings={settings} updateSettings={updateSettings} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="custom-scrollbar"
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '0 16px',
        paddingBottom: '120px',
      }}
    >
        <div key={currentView} className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl mx-auto w-full">
            {renderView()}
        </div>
        <GymNavigation currentView={currentView} setView={setCurrentView} onExit={onBack} />
    </div>
  );
};

export default GymView;
