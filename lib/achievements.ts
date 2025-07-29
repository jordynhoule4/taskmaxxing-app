interface Achievement {
  key: string;
  name: string;
  description: string;
  emoji: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    key: 'chad',
    name: 'Chad',
    description: 'Absolute dominance achieved',
    emoji: '🗿',
    rarity: 'legendary'
  },
  {
    key: 'blitzkrieg',
    name: 'Blitzkrieg',
    description: 'Lightning warfare tactics employed',
    emoji: '⚡',
    rarity: 'epic'
  },
  {
    key: 'napoleon',
    name: 'Napoleon',
    description: 'Strategic brilliance displayed',
    emoji: '🎩',
    rarity: 'rare'
  },
  {
    key: 'stakhanov',
    name: 'Stakhanov',
    description: 'Socialist labor hero status achieved',
    emoji: '⛏️',
    rarity: 'epic'
  },
  {
    key: 'swiss_watch',
    name: 'Swiss Watch',
    description: 'Precision timing mastered',
    emoji: '⌚',
    rarity: 'common'
  },
  {
    key: 'chernobyl',
    name: 'Chernobyl',
    description: 'Not great, not terrible',
    emoji: '☢️',
    rarity: 'legendary'
  },
  {
    key: 'known_unknowns',
    name: 'Known Unknowns',
    description: 'Rumsfeld would be proud',
    emoji: '🤔',
    rarity: 'rare'
  },
  {
    key: 'mission_accomplished',
    name: 'Mission Accomplished',
    description: 'Banner deployed successfully',
    emoji: '🏴',
    rarity: 'epic'
  },
  {
    key: 'stakeholder',
    name: 'Stakeholder',
    description: 'Synergized the deliverables',
    emoji: '📊',
    rarity: 'common'
  },
  {
    key: 'five_year_plan',
    name: 'Five Year Plan',
    description: 'Comrade Stalin approves',
    emoji: '🏭',
    rarity: 'epic'
  },
  {
    key: 'rasputin',
    name: 'Rasputin',
    description: 'Unkillable determination',
    emoji: '🧙‍♂️',
    rarity: 'legendary'
  },
  {
    key: 'machiavelli',
    name: 'Machiavelli',
    description: 'The ends justify the means',
    emoji: '👑',
    rarity: 'rare'
  },
  {
    key: 'florida_man',
    name: 'Florida Man',
    description: 'Chaotic energy harnessed',
    emoji: '🐊',
    rarity: 'rare'
  },
  {
    key: 'rookie',
    name: 'Rookie',
    description: 'Welcome to the big leagues',
    emoji: '🌱',
    rarity: 'common'
  },
  {
    key: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Clinton-esque resilience',
    emoji: '🎷',
    rarity: 'rare'
  },
  {
    key: 'stonks',
    name: 'Stonks',
    description: 'Number go up',
    emoji: '📈',
    rarity: 'common'
  },
  {
    key: 'galaxy_brain',
    name: 'Galaxy Brain',
    description: 'Transcendent planning',
    emoji: '🧠',
    rarity: 'legendary'
  }
];

export function getAchievement(key: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.key === key);
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'text-gray-600 bg-gray-100';
    case 'rare': return 'text-blue-600 bg-blue-100';
    case 'epic': return 'text-purple-600 bg-purple-100';
    case 'legendary': return 'text-yellow-600 bg-yellow-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

export function checkAchievements(
  weekKey: string,
  dailyTasks: any,
  weeklyGoals: any,
  habitCompletions: any,
  allWeeksData: any,
  habits: any[]
): string[] {
  const newAchievements: string[] = [];

  const taskStats = getTaskStats(dailyTasks);
  const habitStats = getHabitStats(habitCompletions);
  const goalStats = getGoalStats(weeklyGoals);

  if (taskStats.earlyTasks >= 5) newAchievements.push('blitzkrieg');
  if (taskStats.earlyTasks >= 10) newAchievements.push('napoleon');
  if (habitStats.perfectDays >= 7) newAchievements.push('swiss_watch');
  if (taskStats.allCompleted && habitStats.perfectWeek && goalStats.allCompleted) {
    newAchievements.push('mission_accomplished');
  }
  if (taskStats.totalTasks >= 20) newAchievements.push('stakeholder');
  if (goalStats.allCompleted) newAchievements.push('machiavelli');
  if (Object.keys(allWeeksData).length === 1) newAchievements.push('rookie');

  return newAchievements;
}

function getTaskStats(dailyTasks: any) {
  let totalTasks = 0;
  let completedTasks = 0;
  let earlyTasks = 0;

  Object.values(dailyTasks || {}).forEach((dayTasks: any) => {
    dayTasks.forEach((task: any) => {
      totalTasks++;
      if (task.completed) {
        completedTasks++;
        if (task.completionStatus === 'early') earlyTasks++;
      }
    });
  });

  return {
    totalTasks,
    completedTasks,
    earlyTasks,
    allCompleted: totalTasks > 0 && completedTasks === totalTasks,
  };
}

function getHabitStats(habitCompletions: any) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let perfectDays = 0;
  const totalHabits = Object.keys(habitCompletions || {}).length;

  days.forEach(day => {
    let dayCompletions = 0;
    Object.values(habitCompletions || {}).forEach((habitData: any) => {
      if (habitData[day]) dayCompletions++;
    });
    if (dayCompletions === totalHabits && totalHabits > 0) perfectDays++;
  });

  return {
    perfectDays,
    perfectWeek: perfectDays === 7 && totalHabits > 0
  };
}

function getGoalStats(weeklyGoals: any) {
  const totalGoals = weeklyGoals?.length || 0;
  const completedGoals = weeklyGoals?.filter((goal: any) => goal.completed).length || 0;
  return {
    totalGoals,
    completedGoals,
    allCompleted: totalGoals > 0 && completedGoals === totalGoals
  };
}
