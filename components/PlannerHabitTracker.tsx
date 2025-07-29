'use client';

import React, { useState, useEffect } from 'react';
import { Check, Plus, X, Edit3, Calendar, Target, Repeat, LogOut, BarChart, Move, Copy, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Habit {
  id: number;
  name: string;
}

// Helper function to get Monday of current week
const getMondayOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
};

export default function PlannerHabitTracker() {
  const router = useRouter();
  const [currentWeekDate, setCurrentWeekDate] = useState(() => getMondayOfWeek(new Date()));
  const [allWeeksData, setAllWeeksData] = useState<any>({});
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newHabit, setNewHabit] = useState('');
  const [newTaskForDay, setNewTaskForDay] = useState<{[key: string]: string}>({});
  const [newFutureTask, setNewFutureTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<{task: any, fromDay: string} | null>(null);
  const [selectedTaskForMove, setSelectedTaskForMove] = useState<{task: any, fromDay: string} | null>(null);
  const [taskToDuplicate, setTaskToDuplicate] = useState<{task: any, fromDay: string} | null>(null);
  const [editingTask, setEditingTask] = useState<{taskId: number, day: string} | null>(null);
  const [editTaskText, setEditTaskText] = useState('');

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
    weekLocked: false,
    futureTasks: []
  };

  const { dailyTasks, weeklyGoals, weekLocked, habitCompletions, futureTasks } = currentWeekData;

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
    // Ensure the new date is always a Monday
    setCurrentWeekDate(getMondayOfWeek(newDate));
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const addTask = (day: string) => {
    const taskText = newTaskForDay[day];
    if (taskText?.trim() && !weekLocked) {
      const updatedTasks = {
        ...dailyTasks,
        [day]: [...(dailyTasks[day] || []), { 
          id: Date.now(), 
          text: taskText, 
          completed: false,
          originalDay: day,
          completionStatus: null
        }]
      };
      updateCurrentWeekData({ dailyTasks: updatedTasks });
      setNewTaskForDay(prev => ({ ...prev, [day]: '' }));
    }
  };

  const handleDragStart = (e: React.DragEvent, task: any, fromDay: string) => {
    setDraggedTask({ task, fromDay });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, toDay: string) => {
    e.preventDefault();
    if (!draggedTask) return;

    const { task, fromDay } = draggedTask;
    if (fromDay === toDay) {
      setDraggedTask(null);
      return;
    }

    if (fromDay === 'future') {
      // Moving from future tasks to a specific day
      const updatedFutureTasks = (futureTasks || []).filter((t: any) => t.id !== task.id);
      const updatedToTasks = [...(dailyTasks[toDay] || []), { 
        ...task, 
        originalDay: toDay,
        completed: false,
        completionStatus: null
      }];

      updateCurrentWeekData({ 
        futureTasks: updatedFutureTasks,
        dailyTasks: {
          ...dailyTasks,
          [toDay]: updatedToTasks
        }
      });
    } else {
      // Regular day-to-day move
      const originalDayIndex = days.indexOf(task.originalDay);
      const completedDayIndex = days.indexOf(toDay);
      let completionStatus = null;
      
      if (completedDayIndex < originalDayIndex) {
        completionStatus = 'early';
      } else if (completedDayIndex > originalDayIndex) {
        completionStatus = 'late';
      }

      const updatedFromTasks = dailyTasks[fromDay]?.filter((t: any) => t.id !== task.id) || [];
      const updatedToTasks = [...(dailyTasks[toDay] || []), { 
        ...task, 
        completed: true,
        completionStatus 
      }];

      const updatedTasks = {
        ...dailyTasks,
        [fromDay]: updatedFromTasks,
        [toDay]: updatedToTasks
      };

      updateCurrentWeekData({ dailyTasks: updatedTasks });
    }
    
    setDraggedTask(null);
  };

  const getTaskColorClass = (task: any) => {
    if (!task.completed) return 'text-gray-700';
    if (task.completionStatus === 'early') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (task.completionStatus === 'late') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200'; // completed on time
  };

  const handleTaskTap = (task: any, fromDay: string) => {
    if (task.completed) return; // Can't move completed tasks
    
    if (selectedTaskForMove && selectedTaskForMove.task.id === task.id) {
      // Deselect if tapping the same task
      setSelectedTaskForMove(null);
    } else {
      // Select this task for moving
      setSelectedTaskForMove({ task, fromDay });
    }
  };

  const handleDayTapForMove = (toDay: string) => {
    if (!selectedTaskForMove) return;
    
    const { task, fromDay } = selectedTaskForMove;
    if (fromDay === toDay) {
      setSelectedTaskForMove(null);
      return;
    }

    if (fromDay === 'future') {
      // Moving from future tasks to a specific day
      const updatedFutureTasks = (futureTasks || []).filter((t: any) => t.id !== task.id);
      const updatedToTasks = [...(dailyTasks[toDay] || []), { 
        ...task, 
        originalDay: toDay,
        completed: false,
        completionStatus: null
      }];

      updateCurrentWeekData({ 
        futureTasks: updatedFutureTasks,
        dailyTasks: {
          ...dailyTasks,
          [toDay]: updatedToTasks
        }
      });
    } else {
      // Regular day-to-day move
      const originalDayIndex = days.indexOf(task.originalDay);
      const completedDayIndex = days.indexOf(toDay);
      let completionStatus = null;
      
      if (completedDayIndex < originalDayIndex) {
        completionStatus = 'early';
      } else if (completedDayIndex > originalDayIndex) {
        completionStatus = 'late';
      }

      const updatedFromTasks = dailyTasks[fromDay]?.filter((t: any) => t.id !== task.id) || [];
      const updatedToTasks = [...(dailyTasks[toDay] || []), { 
        ...task, 
        completed: true,
        completionStatus 
      }];

      const updatedTasks = {
        ...dailyTasks,
        [fromDay]: updatedFromTasks,
        [toDay]: updatedToTasks
      };

      updateCurrentWeekData({ dailyTasks: updatedTasks });
    }
    
    setSelectedTaskForMove(null);
  };

  const handleDuplicateTask = (task: any, fromDay: string) => {
    setTaskToDuplicate({ task, fromDay });
  };

  const duplicateTaskToDay = (toDay: string) => {
    if (!taskToDuplicate) return;
    
    const { task } = taskToDuplicate;
    
    // Create a new task with a new ID but same text and original day
    const duplicatedTask = {
      id: Date.now(),
      text: task.text,
      completed: false,
      originalDay: toDay,
      completionStatus: null
    };
    
    const updatedTasks = {
      ...dailyTasks,
      [toDay]: [...(dailyTasks[toDay] || []), duplicatedTask]
    };
    
    updateCurrentWeekData({ dailyTasks: updatedTasks });
    setTaskToDuplicate(null);
  };

  const cancelDuplication = () => {
    setTaskToDuplicate(null);
  };

  const addFutureTask = () => {
    if (newFutureTask.trim()) {
      const updatedFutureTasks = [...(futureTasks || []), {
        id: Date.now(),
        text: newFutureTask,
        completed: false,
        originalDay: null,
        completionStatus: null,
        notes: ''
      }];
      updateCurrentWeekData({ futureTasks: updatedFutureTasks });
      setNewFutureTask('');
    }
  };

  const deleteFutureTask = (taskId: number) => {
    const updatedFutureTasks = (futureTasks || []).filter((task: any) => task.id !== taskId);
    updateCurrentWeekData({ futureTasks: updatedFutureTasks });
  };

  const startEditFutureTask = (task: any) => {
    setEditingTask({ taskId: task.id, day: 'future' });
    setEditTaskText(task.text);
  };

  const saveEditFutureTask = () => {
    if (!editingTask || !editTaskText.trim()) return;
    
    const { taskId } = editingTask;
    const updatedFutureTasks = (futureTasks || []).map((task: any) => 
      task.id === taskId ? { ...task, text: editTaskText.trim() } : task
    );
    updateCurrentWeekData({ futureTasks: updatedFutureTasks });
    setEditingTask(null);
    setEditTaskText('');
  };

  const handleFutureTaskDragStart = (e: React.DragEvent, task: any) => {
    setDraggedTask({ task, fromDay: 'future' });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFutureTaskTap = (task: any) => {
    if (selectedTaskForMove && selectedTaskForMove.task.id === task.id) {
      setSelectedTaskForMove(null);
    } else {
      setSelectedTaskForMove({ task, fromDay: 'future' });
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

  const startEditTask = (day: string, task: any) => {
    setEditingTask({ taskId: task.id, day });
    setEditTaskText(task.text);
  };

  const saveEditTask = () => {
    if (!editingTask || !editTaskText.trim()) return;
    
    const { taskId, day } = editingTask;
    const updatedTasks = {
      ...dailyTasks,
      [day]: dailyTasks[day].map((task: any) => 
        task.id === taskId ? { ...task, text: editTaskText.trim() } : task
      )
    };
    updateCurrentWeekData({ dailyTasks: updatedTasks });
    setEditingTask(null);
    setEditTaskText('');
  };

  const cancelEditTask = () => {
    setEditingTask(null);
    setEditTaskText('');
  };

  const openTaskNotes = (day: string, task: any) => {
    setTaskNotesOpen({ taskId: task.id, day });
    setTaskNoteText(task.notes || '');
  };

  const saveTaskNotes = () => {
    if (!taskNotesOpen) return;
    
    const { taskId, day } = taskNotesOpen;
    
    if (day === 'future') {
      const updatedFutureTasks = (futureTasks || []).map((task: any) => 
        task.id === taskId ? { ...task, notes: taskNoteText } : task
      );
      updateCurrentWeekData({ futureTasks: updatedFutureTasks });
    } else {
      const updatedTasks = {
        ...dailyTasks,
        [day]: dailyTasks[day].map((task: any) => 
          task.id === taskId ? { ...task, notes: taskNoteText } : task
        )
      };
      updateCurrentWeekData({ dailyTasks: updatedTasks });
    }
    
    setTaskNotesOpen(null);
    setTaskNoteText('');
  };

  const closeTaskNotes = () => {
    setTaskNotesOpen(null);
    setTaskNoteText('');
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <button
              onClick={() => navigateWeek(-1)}
              className="px-2 sm:px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm sm:text-lg"
            >
              ←
            </button>
            <Calendar className="text-blue-600" size={24} />
            <span className="text-base sm:text-3xl">{getCurrentWeekDisplay()}</span>
            <button
              onClick={() => navigateWeek(1)}
              className="px-2 sm:px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm sm:text-lg"
            >
              →
            </button>
          </h1>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => router.push('/notes')}
              className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Notes</span>
            </button>
            <button
              onClick={() => router.push('/stats')}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
            >
              <BarChart size={16} />
              <span className="hidden sm:inline">Stats</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Take the task pill today! 💊</p>
          {taskToDuplicate && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600">Duplicating: "{taskToDuplicate.task.text}" - Tap a day to copy</span>
              <button
                onClick={cancelDuplication}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Edit3 className="text-green-600" />
              Daily Tasks
            </h2>
            

            <div className="space-y-4">
              {days.map(day => (
                <div 
                  key={day} 
                  className={`border rounded-lg p-4 ${
                    selectedTaskForMove && selectedTaskForMove.fromDay !== day
                      ? 'border-blue-400 bg-blue-50 cursor-pointer'
                      : taskToDuplicate
                      ? 'border-green-400 bg-green-50 cursor-pointer'
                      : 'border-gray-200'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                  onClick={() => {
                    if (selectedTaskForMove) {
                      handleDayTapForMove(day);
                    } else if (taskToDuplicate) {
                      duplicateTaskToDay(day);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-700">
                      {day}:
                      {selectedTaskForMove && selectedTaskForMove.fromDay !== day && (
                        <span className="ml-2 text-xs text-blue-600">
                          {selectedTaskForMove.fromDay === 'future' ? '(Tap to schedule here)' : '(Tap to move here)'}
                        </span>
                      )}
                      {taskToDuplicate && (
                        <span className="ml-2 text-xs text-green-600">(Tap to duplicate here)</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTaskForDay[day] || ''}
                        onChange={(e) => setNewTaskForDay(prev => ({ ...prev, [day]: e.target.value }))}
                        placeholder="Add task"
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                        onKeyPress={(e) => e.key === 'Enter' && addTask(day)}
                      />
                      <button
                        onClick={() => addTask(day)}
                        className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(dailyTasks[day] || []).map((task: any) => (
                      <div 
                        key={task.id} 
                        className={`flex items-center gap-2 p-2 rounded border ${
                          getTaskColorClass(task)
                        } ${
                          !task.completed ? 'cursor-move hover:shadow-sm' : ''
                        } ${
                          selectedTaskForMove && selectedTaskForMove.task.id === task.id
                            ? 'ring-2 ring-blue-400 bg-blue-100'
                            : editingTask && editingTask.taskId === task.id && editingTask.day === day
                            ? 'ring-2 ring-green-400 bg-green-50'
                            : ''
                        }`}
                        draggable={!task.completed && (!editingTask || editingTask.taskId !== task.id)}
                        onDragStart={(e) => handleDragStart(e, task, day)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!editingTask) {
                            handleTaskTap(task, day);
                          }
                        }}
                      >
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
                        {editingTask && editingTask.taskId === task.id && editingTask.day === day ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editTaskText}
                              onChange={(e) => setEditTaskText(e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') saveEditTask();
                                if (e.key === 'Escape') cancelEditTask();
                              }}
                              autoFocus
                            />
                            <button
                              onClick={saveEditTask}
                              disabled={!editTaskText.trim()}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditTask}
                              className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className={`flex-1 ${task.completed ? 'line-through' : ''}`}>
                            {task.text}
                            {task.completed && task.completionStatus && (
                              <span className="ml-2 text-xs">
                                {task.completionStatus === 'early' ? '(Early)' : task.completionStatus === 'late' ? '(Late)' : ''}
                              </span>
                            )}
                            {!task.completed && (
                              <Move className="inline ml-2 text-gray-400" size={12} />
                            )}
                          </span>
                        )}
                        {!(editingTask && editingTask.taskId === task.id && editingTask.day === day) && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openTaskNotes(day, task);
                              }}
                              className={`transition-colors ${
                                task.notes && task.notes.trim() 
                                  ? 'text-purple-600 hover:text-purple-800' 
                                  : 'text-gray-400 hover:text-purple-600'
                              }`}
                              title="Task notes"
                            >
                              <MessageSquare size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditTask(day, task);
                              }}
                              className="text-blue-500 hover:text-blue-700 transition-colors"
                              title="Edit task"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateTask(task, day);
                              }}
                              className="text-green-500 hover:text-green-700 transition-colors"
                              title="Duplicate task"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(day, task.id);
                              }}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Delete task"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
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
          
          {/* Weekly Goals */}
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

        <div className="space-y-6">
          {/* Future Tasks Repository */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="text-indigo-600" />
              Future Tasks
            </h2>
            
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newFutureTask}
                onChange={(e) => setNewFutureTask(e.target.value)}
                placeholder="Add future task"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyPress={(e) => e.key === 'Enter' && addFutureTask()}
              />
              <button
                onClick={addFutureTask}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {(futureTasks || []).map((task: any) => (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-2 p-3 rounded border hover:shadow-sm ${
                    selectedTaskForMove && selectedTaskForMove.task.id === task.id
                      ? 'ring-2 ring-blue-400 bg-blue-100 border-blue-200'
                      : editingTask && editingTask.taskId === task.id && editingTask.day === 'future'
                      ? 'ring-2 ring-green-400 bg-green-50 border-green-200'
                      : 'border-gray-200 bg-gray-50'
                  } ${
                    !editingTask || editingTask.taskId !== task.id ? 'cursor-move' : ''
                  }`}
                  draggable={!editingTask || editingTask.taskId !== task.id}
                  onDragStart={(e) => handleFutureTaskDragStart(e, task)}
                  onClick={() => {
                    if (!editingTask) {
                      handleFutureTaskTap(task);
                    }
                  }}
                >
                  {editingTask && editingTask.taskId === task.id && editingTask.day === 'future' ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editTaskText}
                        onChange={(e) => setEditTaskText(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') saveEditFutureTask();
                          if (e.key === 'Escape') cancelEditTask();
                        }}
                        autoFocus
                      />
                      <button
                        onClick={saveEditFutureTask}
                        disabled={!editTaskText.trim()}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditTask}
                        className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <Move className="text-gray-400" size={16} />
                      <span className="flex-1 text-gray-700">
                        {task.text}
                        <span className="ml-2 text-xs text-indigo-600">(Drag to schedule)</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTaskNotes('future', task);
                          }}
                          className={`transition-colors ${
                            task.notes && task.notes.trim() 
                              ? 'text-purple-600 hover:text-purple-800' 
                              : 'text-gray-400 hover:text-purple-600'
                          }`}
                          title="Task notes"
                        >
                          <MessageSquare size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditFutureTask(task);
                          }}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="Edit future task"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFutureTask(task.id);
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Delete future task"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {(!futureTasks || futureTasks.length === 0) && (
                <p className="text-gray-400 italic">No future tasks planned</p>
              )}
            </div>
          </div>

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
        </div>
      </div>
      
      {/* Task System Explanation */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">How the Task System Works</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Click the <Plus className="inline w-4 h-4 mx-1" /> button next to each day to add tasks directly to that day</p>
          <div className="space-y-1">
            <p>• <strong>Future Tasks:</strong> Add tasks to the Future Tasks repository and drag them to specific days when ready to schedule</p>
            <p>• <strong>Task Notes:</strong> Click the <MessageSquare className="inline w-3 h-3 mx-1" /> button to add detailed notes about what a task entails</p>
            <p>• <strong>Edit Tasks:</strong> Click the <Edit3 className="inline w-3 h-3 mx-1" /> button to edit any task text inline</p>
            <p>• <strong>Desktop:</strong> Drag and drop incomplete tasks between days to reschedule them</p>
            <p>• <strong>Mobile:</strong> Tap a task (with <Move className="inline w-3 h-3 mx-1" /> icon) to select it, then tap the day you want to move it to</p>
            <p>• <strong>Duplicate:</strong> Click the <Copy className="inline w-3 h-3 mx-1" /> button to copy a task, then tap any day to create a duplicate there</p>
          </div>
          <p>• When you complete a task on a different day than planned:</p>
          <div className="ml-4 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span className="text-blue-600">Blue tasks = Completed early (before the planned day)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span className="text-yellow-700">Yellow tasks = Completed late (after the planned day)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span className="text-green-600">Green tasks = Completed on time</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Task Notes Modal */}
      {taskNotesOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <MessageSquare className="text-purple-600" size={20} />
                Task Notes
              </h3>
              <button
                onClick={closeTaskNotes}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task: {taskNotesOpen.day === 'future' 
                    ? (futureTasks || []).find((t: any) => t.id === taskNotesOpen.taskId)?.text
                    : dailyTasks[taskNotesOpen.day]?.find((t: any) => t.id === taskNotesOpen.taskId)?.text
                  }
                </label>
              </div>
              
              <textarea
                value={taskNoteText}
                onChange={(e) => setTaskNoteText(e.target.value)}
                placeholder="Add detailed notes about this task..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[200px] resize-vertical text-sm"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <button
                onClick={closeTaskNotes}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveTaskNotes}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Save size={16} />
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
