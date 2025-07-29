'use client';

import React, { useState, useEffect } from 'react';
import { Check, Plus, X, Edit3, Calendar, Target, Repeat, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Habit {
  id: number;
  name: string;
}

export default function PlannerHabitTracker() {
  const router = useRouter();
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date(2025, 6, 28));
  const [allWeeksData, setAllWeeksData] = useState<any>({});
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newHabit, setNewHabit] = useState('');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [loading, setLoading] = useState(true);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getCurrentWeekKey = () => {
    const month = currentWeekDate.getMonth() + 1;
    const day = currentWeekDate.getDate();
    const year = currentWeekDate.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const getCurrentWeekDisplay = () => {
    const month = currentWeekDate.getMonth() + 1;
    const day = currentWeekDate.getDate();
    return `${month}/${day} Week`;
  };

  const currentWeekKey = getCurrentWeekKey();
  const currentWeekData = allWeeksData[currentWeekKey] || {
    dailyTasks: {},
    weeklyGoals: [],
    habitCompletions: {},
    weekLocked: false
  };

  const { dailyTasks, weeklyGoals, weekLocked, habitCompletions } = currentWeekData;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (habits.length > 0) {
      loadWeekData();
    }
  }, [currentWeekKey, habits]);

  const loadInitialData = async () => {
    try {
      const habitsResponse = await fetch('/api/habits');
      if (habitsResponse.ok) {
        const habitsData = await habitsResponse.json();
        setHabits(habitsData.habits);
      }

      const allWeeksResponse = await fetch('/api/weeks?all=true');
      if (allWeeksResponse.ok) {
        const allWeeksData = await allWeeksResponse.json();
        setAllWeeksData(allWeeksData.allWeeksData);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeekData = async () => {
    try {
      const response = await fetch(`/api/weeks?week=${currentWeekKey}`);
      if (response.ok) {
        const data = await response.json();
        setAllWeeksData((prev: any) => ({
          ...prev,
          [currentWeekKey]: data.weekData
        }));
      }
    } catch (error) {
      console.error('Failed to load week data:', error);
    }
  };

  const saveWeekData = async (weekData: any) => {
    try {
      await fetch('/api/weeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekKey: currentWeekKey,
          ...weekData
        }),
      });
    } catch (error) {
      console.error('Failed to save week data:', error);
    }
  };

  const updateCurrentWeekData = (updates: any) => {
    const newWeekData = { ...currentWeekData, ...updates };
    setAllWeeksData((prev: any) => ({
      ...prev,
      [currentWeekKey]: newWeekData
    }));
    saveWeekData(newWeekData);
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentWeekDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentWeekDate(newDate);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const addTask = () => {
    if (newTask.trim() && !weekLocked) {
      const updatedTasks = {
        ...dailyTasks,
        [selectedDay]: [...(dailyTasks[selectedDay] || []), { 
          id: Date.now(), 
          text: newTask, 
          completed: false,
          originalDay: selectedDay,
          completionStatus: null
        }]
      };
      updateCurrentWeekData({ dailyTasks: updatedTasks });
      setNewTask('');
    }
  };

  const toggleTask = (day: string, taskId: number) => {
    const updatedTasks = {
      ...dailyTasks,
      [day]: dailyTasks[day].map((task: any) => {
        if (task.id === taskId) {
          return { ...task, completed: !task.completed };
        }
        return task;
      })
    };
    updateCurrentWeekData({ dailyTasks: updatedTasks });
  };

  const deleteTask = (day: string, taskId: number) => {
    const updatedTasks = {
      ...dailyTasks,
      [day]: dailyTasks[day].filter((task: any) => task.id !== taskId)
    };
    updateCurrentWeekData({ dailyTasks: updatedTasks });
  };

  const addWeeklyGoal = () => {
    if (newGoal.trim()) {
      const updatedGoals = [...weeklyGoals, { id: Date.now(), text: newGoal, completed: false }];
      updateCurrentWeekData({ weeklyGoals: updatedGoals });
      setNewGoal('');
    }
  };

  const toggleWeeklyGoal = (goalId: number) => {
    const updatedGoals = weeklyGoals.map((goal: any) =>
      goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
    );
    updateCurrentWeekData({ weeklyGoals: updatedGoals });
  };

  const deleteWeeklyGoal = (goalId: number) => {
    const updatedGoals = weeklyGoals.filter((goal: any) => goal.id !== goalId);
    updateCurrentWeekData({ weeklyGoals: updatedGoals });
  };

  const addHabit = async () => {
    if (newHabit.trim()) {
      try {
        const response = await fetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newHabit }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setHabits(prev => [...prev, data.habit]);
          setNewHabit('');
        }
      } catch (error) {
        console.error('Failed to create habit:', error);
      }
    }
  };

  const toggleHabit = (habitId: number, day: string) => {
    const updatedHabitCompletions = {
      ...habitCompletions,
      [habitId]: {
        ...habitCompletions[habitId],
        [day]: !habitCompletions[habitId]?.[day]
      }
    };
    updateCurrentWeekData({ habitCompletions: updatedHabitCompletions });
  };

  const deleteHabit = async (habitId: number) => {
    try {
      const response = await fetch(`/api/habits?id=${habitId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setHabits(prev => prev.filter(habit => habit.id !== habitId));
      }
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  };

  const getHabitStreakForWeek = (habitId: number) => {
    const completedDays = days.filter(day => habitCompletions[habitId]?.[day]);
    return completedDays.length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600">Loading your Taskmaxxing dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <button
              onClick={() => navigateWeek(-1)}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-lg"
            >
              ←
            </button>
            <Calendar className="text-blue-600" />
            {getCurrentWeekDisplay()}
            <button
              onClick={() => navigateWeek(1)}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-lg"
            >
              →
            </button>
          </h1>
          
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
        
        <p className="text-gray-600">Level up your productivity game! 🚀</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Edit3 className="text-green-600" />
              Daily Tasks
            </h2>
            
            <div className="mb-4 flex gap-2">
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add new task"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <button
                onClick={addTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {days.map(day => (
                <div key={day} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">{day}:</h3>
                  <div className="space-y-2">
                    {(dailyTasks[day] || []).map((task: any) => (
                      <div key={task.id} className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTask(day, task.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            task.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {task.completed && <Check size={14} />}
                        </button>
                        <span className={`flex-1 ${task.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                          {task.text}
                        </span>
                        <button
                          onClick={() => deleteTask(day, task.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {(!dailyTasks[day] || dailyTasks[day].length === 0) && (
                      <p className="text-gray-400 italic">No tasks scheduled</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Repeat className="text-purple-600" />
              Daily Habits
            </h2>
            
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                placeholder="Add new habit"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && addHabit()}
              />
              <button
                onClick={addHabit}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {habits.map(habit => (
                <div key={habit.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">{habit.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-purple-600 font-medium">
                        {getHabitStreakForWeek(habit.id)}/7
                      </span>
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {days.map(day => (
                      <button
                        key={day}
                        onClick={() => toggleHabit(habit.id, day)}
                        className={`w-8 h-8 rounded border-2 flex items-center justify-center text-xs transition-colors ${
                          habitCompletions[habit.id]?.[day]
                            ? 'bg-purple-500 border-purple-500 text-white'
                            : 'border-gray-300 hover:border-purple-400'
                        }`}
                        title={day}
                      >
                        {habitCompletions[habit.id]?.[day] && <Check size={12} />}
                        {!habitCompletions[habit.id]?.[day] && day.charAt(0)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="text-orange-600" />
              Weekly Goals
            </h2>
            
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Add weekly goal"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                onKeyPress={(e) => e.key === 'Enter' && addWeeklyGoal()}
              />
              <button
                onClick={addWeeklyGoal}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {weeklyGoals.map((goal: any) => (
                <div key={goal.id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleWeeklyGoal(goal.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      goal.completed
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'border-gray-300 hover:border-orange-400'
                    }`}
                  >
                    {goal.completed && <Check size={14} />}
                  </button>
                  <span className={`flex-1 ${goal.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                    {goal.text}
                  </span>
                  <button
                    onClick={() => deleteWeeklyGoal(goal.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {weeklyGoals.length === 0 && (
                <p className="text-gray-400 italic">No weekly goals set</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
