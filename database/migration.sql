-- Add future_tasks column to week_data table
ALTER TABLE week_data ADD COLUMN IF NOT EXISTS future_tasks JSONB DEFAULT '[]';

-- Add target column to habits table
ALTER TABLE habits ADD COLUMN IF NOT EXISTS target INTEGER DEFAULT 7;