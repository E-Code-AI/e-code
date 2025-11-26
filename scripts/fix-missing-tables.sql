-- Create users table (mandatory for Replit Auth)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR UNIQUE,
  password TEXT,
  email VARCHAR UNIQUE,
  display_name VARCHAR,
  avatar_url VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  bio TEXT,
  website VARCHAR,
  github_username VARCHAR,
  twitter_username VARCHAR,
  linkedin_username VARCHAR,
  reputation INTEGER DEFAULT 0,
  is_mentor BOOLEAN DEFAULT FALSE,
  role TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR,
  stripe_price_id VARCHAR,
  subscription_status VARCHAR,
  subscription_current_period_end TIMESTAMP,
  email_verification_token VARCHAR,
  email_verification_expiry TIMESTAMP,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR,
  password_reset_token VARCHAR,
  password_reset_expiry TIMESTAMP,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP,
  preferred_ai_model VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id VARCHAR PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR NOT NULL UNIQUE,
  email VARCHAR NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
