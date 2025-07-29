CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE habits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target INTEGER DEFAULT 7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE week_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    week_key VARCHAR(50) NOT NULL,
    daily_tasks JSONB DEFAULT '{}',
    weekly_goals JSONB DEFAULT '[]',
    habit_completions JSONB DEFAULT '{}',
    future_tasks JSONB DEFAULT '[]',
    week_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, week_key)
);

CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_key VARCHAR(100) NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    week_unlocked VARCHAR(50),
    UNIQUE(user_id, achievement_key)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_week_data_user_week ON week_data(user_id, week_key);
CREATE INDEX idx_achievements_user_id ON achievements(user_id);
