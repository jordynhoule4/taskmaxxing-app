'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Calendar, Target, Repeat, ArrowLeft, TrendingUp, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HabitStats {
  name: string;
  totalDays: number;
  completedDays: number;
  completionRate: number;
  streak: number;
}

interface WeekStats {
  weekKey: string;
  weekDisplay: string;
  totalTasks: number;
  completedTasks: number;
  totalGoals: number;
  completedGoals: number;
  habitCompletions: { [habitId: number]: number };
}

export default function StatsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<any[]>([]);
  const [allWeeksData, setAllWeeksData] = useState<any>({});
  const [habitStats, setHabitStats] = useState<HabitStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeekStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    totalGoals: 0,
    completedGoals: 0,
    averageHabitCompletion: 0
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (habits.length > 0 && Object.keys(allWeeksData).length > 0) {
      calculateStats();
    }
  }, [habits, allWeeksData]);

  const loadData = async () => {
    try {
      // Load habits
      const habitsResponse = await fetch('/api/habits');
      if (habitsResponse.ok) {
        const habitsData = await habitsResponse.json();
        setHabits(habitsData.habits);
      }

      // Load all weeks data
      const allWeeksResponse = await fetch('/api/weeks?all=true');
      if (allWeeksResponse.ok) {
        const allWeeksData = await allWeeksResponse.json();
        setAllWeeksData(allWeeksData.allWeeksData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const weeks = Object.keys(allWeeksData);
    let totalTasks = 0;
    let completedTasks = 0;
    let totalGoals = 0;
    let completedGoals = 0;
    
    // Initialize habit stats
    const habitStatsMap: { [habitId: number]: { total: number; completed: number; name: string } } = {};
    habits.forEach(habit => {
      habitStatsMap[habit.id] = { total: 0, completed: 0, name: habit.name };
    });

    // Calculate weekly stats
    const weekStats: WeekStats[] = weeks.map(weekKey => {
      const weekData = allWeeksData[weekKey];
      const dailyTasks = weekData.dailyTasks || {};
      const weeklyGoals = weekData.weeklyGoals || [];
      const habitCompletions = weekData.habitCompletions || {};

      // Count tasks
      let weekTotalTasks = 0;
      let weekCompletedTasks = 0;
      Object.values(dailyTasks).forEach((dayTasks: any) => {
        weekTotalTasks += dayTasks.length;
        weekCompletedTasks += dayTasks.filter((task: any) => task.completed).length;
      });

      // Count goals
      const weekTotalGoals = weeklyGoals.length;
      const weekCompletedGoals = weeklyGoals.filter((goal: any) => goal.completed).length;

      // Count habit completions for this week
      const weekHabitCompletions: { [habitId: number]: number } = {};
      habits.forEach(habit => {
        let completions = 0;
        days.forEach(day => {
          if (habitCompletions[habit.id]?.[day]) {
            completions++;
            habitStatsMap[habit.id].completed++;
          }
          habitStatsMap[habit.id].total++;
        });
        weekHabitCompletions[habit.id] = completions;
      });

      totalTasks += weekTotalTasks;
      completedTasks += weekCompletedTasks;
      totalGoals += weekTotalGoals;
      completedGoals += weekCompletedGoals;

      return {
        weekKey,
        weekDisplay: weekKey,
        totalTasks: weekTotalTasks,
        completedTasks: weekCompletedTasks,
        totalGoals: weekTotalGoals,
        completedGoals: weekCompletedGoals,
        habitCompletions: weekHabitCompletions
      };
    });

    // Calculate habit stats with completion rates
    const habitStatsArray: HabitStats[] = habits.map(habit => {
      const stats = habitStatsMap[habit.id];
      return {
        name: habit.name,
        totalDays: stats.total,
        completedDays: stats.completed,
        completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
        streak: calculateCurrentStreak(habit.id)
      };
    });

    const averageHabitCompletion = habitStatsArray.length > 0 
      ? habitStatsArray.reduce((sum, habit) => sum + habit.completionRate, 0) / habitStatsArray.length 
      : 0;

    setWeeklyStats(weekStats);
    setHabitStats(habitStatsArray);
    setOverallStats({
      totalTasks,
      completedTasks,
      totalGoals,
      completedGoals,
      averageHabitCompletion
    });
  };

  const calculateCurrentStreak = (habitId: number): number => {
    // This is a simplified streak calculation
    // In a real app, you'd want to calculate based on consecutive days
    const weeks = Object.keys(allWeeksData).sort().reverse();
    let streak = 0;
    
    for (const weekKey of weeks) {
      const weekData = allWeeksData[weekKey];
      const habitCompletions = weekData.habitCompletions || {};
      const weekCompletions = days.filter(day => habitCompletions[habitId]?.[day]).length;
      
      if (weekCompletions >= 5) { // Consider it a good week if 5+ days completed
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart className="mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600">Loading your stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart className="text-blue-600" />
              Your Stats
            </h1>
          </div>
        </div>
        <p className="text-gray-600">Track your progress and see how you're doing! 📊</p>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Task Completion</p>
              <p className="text-2xl font-bold text-green-600">
                {overallStats.totalTasks > 0 ? Math.round((overallStats.completedTasks / overallStats.totalTasks) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-500">
                {overallStats.completedTasks} of {overallStats.totalTasks} tasks
              </p>
            </div>
            <CheckCircle className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Goal Achievement</p>
              <p className="text-2xl font-bold text-orange-600">
                {overallStats.totalGoals > 0 ? Math.round((overallStats.completedGoals / overallStats.totalGoals) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-500">
                {overallStats.completedGoals} of {overallStats.totalGoals} goals
              </p>
            </div>
            <Target className="text-orange-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Habit Consistency</p>
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(overallStats.averageHabitCompletion)}%
              </p>
              <p className="text-xs text-gray-500">Average across all habits</p>
            </div>
            <Repeat className="text-purple-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Weeks Tracked</p>
              <p className="text-2xl font-bold text-blue-600">{weeklyStats.length}</p>
              <p className="text-xs text-gray-500">Total data points</p>
            </div>
            <Calendar className="text-blue-600" size={32} />
          </div>
        </div>
      </div>

      {/* Habit Performance */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Repeat className="text-purple-600" />
          Habit Performance
        </h2>
        
        {habitStats.length === 0 ? (
          <p className="text-gray-500 italic">No habits tracked yet</p>
        ) : (
          <div className="space-y-4">
            {habitStats.map((habit, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-700">{habit.name}</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-purple-600 font-medium">
                      {Math.round(habit.completionRate)}%
                    </span>
                    <span className="text-gray-500">
                      {habit.completedDays}/{habit.totalDays} days
                    </span>
                    <span className="text-blue-600">
                      {habit.streak} week streak
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getProgressBarColor(habit.completionRate)}`}
                    style={{ width: `${habit.completionRate}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Breakdown */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="text-blue-600" />
          Weekly Breakdown
        </h2>
        
        {weeklyStats.length === 0 ? (
          <p className="text-gray-500 italic">No weekly data available</p>
        ) : (
          <div className="space-y-4">
            {weeklyStats.slice(-8).reverse().map((week, index) => (
              <div key={week.weekKey} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-700">Week of {week.weekDisplay}</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600">
                      Tasks: {week.totalTasks > 0 ? Math.round((week.completedTasks / week.totalTasks) * 100) : 0}%
                    </span>
                    <span className="text-orange-600">
                      Goals: {week.totalGoals > 0 ? Math.round((week.completedGoals / week.totalGoals) * 100) : 0}%
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Tasks</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 bg-green-500 rounded-full"
                          style={{ width: `${week.totalTasks > 0 ? (week.completedTasks / week.totalTasks) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span>{week.completedTasks}/{week.totalTasks}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 mb-1">Goals</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 bg-orange-500 rounded-full"
                          style={{ width: `${week.totalGoals > 0 ? (week.completedGoals / week.totalGoals) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span>{week.completedGoals}/{week.totalGoals}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 mb-1">Habits</p>
                    <div className="flex flex-wrap gap-1">
                      {habits.map(habit => (
                        <span 
                          key={habit.id}
                          className={`px-2 py-1 rounded text-xs ${
                            (week.habitCompletions[habit.id] || 0) >= 5 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {habit.name}: {week.habitCompletions[habit.id] || 0}/7
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}