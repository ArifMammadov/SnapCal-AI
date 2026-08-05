# SnapCal AI — Software Requirements Specification (SRS)

**Version:** 1.0.0-draft  
**Date:** 2026-08-05  
**Status:** Draft for review  
**Repository:** https://github.com/ArifMammadov/SnapCal-AI

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [User Flows](#3-user-flows)
4. [Business Logic](#4-business-logic)
5. [API Specification](#5-api-specification)
6. [Database Schema](#6-database-schema)
7. [Backend Architecture](#7-backend-architecture)
8. [AI Architecture](#8-ai-architecture)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Subscription & Payment Flow](#10-subscription--payment-flow)
11. [Marketplace](#11-marketplace)
12. [Admin Panel](#12-admin-panel)
13. [Notification System](#13-notification-system)
14. [Error, Loading & Empty States](#14-error-loading--empty-states)
15. [Acceptance Criteria](#15-acceptance-criteria)
16. [Security & Compliance](#16-security--compliance)
17. [Deployment & Operations](#17-deployment--operations)

---

## 1. Product Overview

### 1.1 Purpose
SnapCal AI is an AI-powered nutrition and fitness mobile web application delivered as a Telegram Mini App and PWA. It combines manual health tracking, AI coaching, food photo analysis, subscription plans, and a digital marketplace of fitness/nutrition programs.

### 1.2 Target Audience
- People who want to lose weight, build muscle, or maintain a healthy lifestyle.
- Telegram users seeking an integrated AI health coach.
- Users comfortable with manual logging and AI-assisted food analysis.

### 1.3 Key Value Propositions
- **AI Coach** with long-term memory and personalized advice.
- **Food photo analysis** for instant calorie/macro estimation.
- **Manual tracking** of weight, water, sleep, steps, activity, meals.
- **6-month transformation plans** with milestones.
- **Marketplace** of expert programs (subscriptions).
- **Multi-language** interface based on Telegram language and user choice.
- **Freemium model** with 7-day trial, then 1 free AI message/day, Pro unlocks unlimited.

### 1.4 Platforms
- **Primary:** Mobile web PWA inside Telegram Mini App.
- **Secondary:** Standalone mobile web for testing.
- **Future:** No native iOS/Android planned at this stage.

### 1.5 External Integrations
- Telegram Mini App + Telegram Bot (auth, notifications).
- OpenRouter (LLM routing).
- Ollama (local fallback for embeddings, light models).
- Stripe (subscriptions + marketplace).
- Telegram Wallet / TON (crypto payments, future).
- Redis (cache, sessions, short-term memory).
- PostgreSQL + pgvector (primary DB + vector memory).
- S3/DO Spaces (avatars, food photos).

---

## 2. Functional Requirements

### 2.1 Onboarding

| ID | Requirement | Priority |
|----|-------------|----------|
| ON-01 | User enters via Telegram Bot or Mini App. | P0 |
| ON-02 | System extracts Telegram profile: name, username, avatar, language, region. | P0 |
| ON-03 | System creates user account automatically on first entry. | P0 |
| ON-04 | User completes health profile: birth date, gender, height, current weight, target weight, primary goal, activity level, dietary preferences, allergies. | P0 |
| ON-05 | System generates daily calorie, macro, water, sleep, steps targets based on profile. | P0 |
| ON-06 | System shows personalized 6-month transformation roadmap. | P1 |
| ON-07 | User can change language after onboarding (default from Telegram). | P1 |

### 2.2 Home Screen

| ID | Requirement | Priority |
|----|-------------|----------|
| HM-01 | Show greeting with user name and current date. | P0 |
| HM-02 | Display circular calorie ring with current vs. goal. | P0 |
| HM-03 | Show inner rings for protein and steps progress. | P1 |
| HM-04 | Display health score with 7-day micro-chart. | P1 |
| HM-05 | Show "View Full Transformation Plan" CTA. | P1 |
| HM-06 | Display horizontal scroll of metric cards: water, sleep, protein, carbs, fat, steps. | P0 |
| HM-07 | Show today's meals with expand/collapse detail and macros. | P0 |
| HM-08 | Allow "+ Add" meal entry. | P0 |
| HM-09 | Show AI insight card with actionable suggestions. | P1 |
| HM-10 | Show marketplace preview with "See All" CTA. | P1 |

### 2.3 Activity Screen

| ID | Requirement | Priority |
|----|-------------|----------|
| AC-01 | Show weekly calendar with steps mini-bars. | P0 |
| AC-02 | Allow day selection. | P1 |
| AC-03 | Show summary strip: calories, active time, steps, distance. | P0 |
| AC-04 | Display timeline of logged activities. | P0 |
| AC-05 | Allow adding activity with type, duration, time. | P0 |
| AC-06 | Estimate calories from activity type and duration. | P1 |
| AC-07 | Allow deleting activity. | P1 |
| AC-08 | Show empty state when no activities. | P1 |

### 2.4 AI Coach Screen

| ID | Requirement | Priority |
|----|-------------|----------|
| AI-01 | Display chat history with user and AI messages. | P0 |
| AI-02 | Support text messages. | P0 |
| AI-03 | Support voice messages (record → transcribe → text). | P1 |
| AI-04 | Support food photo upload for analysis. | P0 |
| AI-05 | Show suggested prompt chips. | P1 |
| AI-06 | Show typing indicator. | P1 |
| AI-07 | Display food analysis result as macro card with save/edit. | P0 |
| AI-08 | Allow saving analyzed food to daily log. | P0 |
| AI-09 | AI must consider user profile, goals, and history. | P0 |
| AI-10 | AI must remember preferences and corrections. | P0 |
| AI-11 | Free users: 7-day unlimited trial, then 1 message/day. | P0 |
| AI-12 | Pro users: unlimited messages. | P0 |
| AI-13 | AI must not provide medical diagnoses. | P0 |

### 2.5 Statistics Screen

| ID | Requirement | Priority |
|----|-------------|----------|
| ST-01 | Show period selector: 7D, 30D, 6M. | P0 |
| ST-02 | Display top summary cards: avg calories, weight lost, streak. | P0 |
| ST-03 | Show chart cards for calories, weight, protein, water, sleep, steps. | P0 |
| ST-04 | Each chart has area/line/bar visualization. | P1 |
| ST-05 | Show AI progress insights. | P1 |

### 2.6 Marketplace Screen

| ID | Requirement | Priority |
|----|-------------|----------|
| MP-01 | Show category filter: All, Yoga, Home Fitness, Gym, Weight Loss, Muscle Gain, Running. | P0 |
| MP-02 | Display featured program hero. | P1 |
| MP-03 | Display program list with image, rating, duration, level, price. | P0 |
| MP-04 | Show program detail bottom sheet with includes, instructor, reviews. | P0 |
| MP-05 | Allow enrollment via Stripe or TON wallet. | P0 |
| MP-06 | Mark enrolled programs. | P1 |
| MP-07 | Programs are subscription-based. | P0 |

### 2.7 Profile Screen

| ID | Requirement | Priority |
|----|-------------|----------|
| PR-01 | Show profile hero with avatar, name, member since, Pro badge, streak. | P0 |
| PR-02 | Display stat cards: weight lost, days active, health score. | P1 |
| PR-03 | Menu: Personal Information, Goals, Subscription, Settings, FAQ, Support, Privacy, Terms. | P0 |
| PR-04 | Allow editing personal info and goals. | P0 |
| PR-05 | Show subscription status, plan, renewal date, included features. | P0 |
| PR-06 | Allow cancel subscription. | P1 |
| PR-07 | Settings: dark mode, push notifications, meal reminders, units. | P1 |
| PR-08 | Sign out. | P1 |

### 2.8 Goal Plan Screen

| ID | Requirement | Priority |
|----|-------------|----------|
| GP-01 | Show 6-month transformation roadmap. | P1 |
| GP-02 | Display start/target/current weight. | P1 |
| GP-03 | Show monthly milestones with focus, calories, workouts. | P1 |
| GP-04 | Mark completed/current/future milestones. | P1 |

---

## 3. User Flows

### 3.1 First Entry (Telegram Mini App)

```
User opens Telegram Bot → Tap "Open Mini App"
    ↓
System verifies Telegram initData
    ↓
Create account (if new) or load existing
    ↓
If profile incomplete → Onboarding flow
    ↓
Home Screen
```

### 3.2 Log Meal via AI

```
User taps "+ Add" or AI Coach camera
    ↓
Upload photo or type description
    ↓
AI analyzes (Vision LLM or text parsing)
    ↓
Show macro card
    ↓
User edits or saves
    ↓
Save to daily log → update Home rings
```

### 3.3 Log Activity

```
User opens Activity → Tap FAB +
    ↓
Select activity type, duration, time
    ↓
Estimate calories
    ↓
Save → update timeline and summary
```

### 3.4 Upgrade to Pro

```
User hits AI limit or opens Subscription
    ↓
Show plans: $5/mo, $25/6mo, $45/year
    ↓
Select plan → Stripe checkout
    ↓
Webhook updates subscription status
    ↓
Unlock unlimited AI + features
```

### 3.5 Marketplace Enrollment

```
User opens Marketplace → selects program
    ↓
Bottom sheet with details
    ↓
Tap Enroll → payment (Stripe/TON)
    ↓
Webhook confirms purchase
    ↓
Mark enrolled, grant access to program content
```

---

## 4. Business Logic

### 4.1 Freemium & AI Limits
- New user gets 7 days unlimited trial from first AI interaction.
- After trial: free users can send 1 AI message per day.
- Pro users have unlimited messages.
- Photo analysis counts as 1 AI message.
- Voice message: transcription + AI response = 1 message.

### 4.2 Subscription Tiers

| Plan | Price | Duration | Features |
|------|-------|----------|----------|
| Free | $0 | Forever | Manual tracking, 1 AI msg/day after trial, basic stats |
| Pro Monthly | $5 | 1 month | Unlimited AI, photo analysis, plans, analytics, support, marketplace discount |
| Pro 6 Months | $25 | 6 months | Same as monthly, discounted |
| Pro Annual | $45 | 12 months | Same as monthly, best value |

### 4.3 Marketplace
- Programs are subscription products created by admin.
- Payment: Stripe primary, TON via Telegram Wallet secondary.
- Admin can set price, duration, category, description, includes.
- Commission model deferred to post-launch discussion.

### 4.4 Goals & Plans
- System generates 6-month roadmap based on start weight, target weight, goal.
- Milestones are static templates initially; future: AI-generated.
- Progress updates from weight logs.

### 4.5 Language
- Default language = Telegram user's interface language.
- Supported: English, Russian, Uzbek, Kazakh, Arabic (RTL).
- User can override in Profile → Settings.
- Region-specific defaults: Uzbekistan/Uzbek → Uzbek; Kazakhstan → Kazakh or Russian; Arabic countries → Arabic.

### 4.6 Currency
- Subscriptions and marketplace: USD and TON tokens.

---

## 5. API Specification

### 5.1 Authentication

#### POST /api/auth/telegram
**Description:** Verify Telegram initData and issue tokens.

**Request:**
```json
{
  "initData": "query_id=...&user=...&auth_date=...&hash=..."
}
```

**Response:**
```json
{
  "accessToken": "jwt...",
  "refreshToken": "jwt...",
  "user": { "id", "telegramId", "name", "language" }
}
```

#### POST /api/auth/refresh
Rotate refresh token, issue new access token.

### 5.2 User

#### GET /api/me
Return current user profile.

#### PATCH /api/me
Update profile fields.

#### GET /api/me/goals
Return goals and targets.

#### PATCH /api/me/goals
Update goals.

### 5.3 Tracking

#### POST /api/logs/food
Log food entry.

```json
{
  "mealType": "breakfast",
  "name": "Oatmeal",
  "calories": 420,
  "protein": 28,
  "carbs": 62,
  "fat": 12,
  "loggedAt": "2026-08-05T08:30:00Z"
}
```

#### GET /api/logs/food?date=YYYY-MM-DD
List food logs for date.

#### POST /api/logs/activity
Log activity.

#### GET /api/logs/activity?date=YYYY-MM-DD
List activities.

#### POST /api/logs/water
Log water intake.

#### POST /api/logs/weight
Log weight.

#### POST /api/logs/sleep
Log sleep.

#### GET /api/summary?date=YYYY-MM-DD
Return daily summary: calories, macros, water, sleep, steps, activities, health score.

### 5.4 AI Coach

#### POST /api/ai/chat
Send message to AI Coach.

```json
{
  "message": "What should I eat for dinner?",
  "attachments": []
}
```

**Response:**
```json
{
  "message": {
    "id": "...",
    "role": "ai",
    "type": "text",
    "content": "...",
    "timestamp": "..."
  },
  "usedLimit": true
}
```

#### POST /api/ai/analyze-photo
Analyze food photo.

```json
{
  "imageUrl": "https://cdn.snapcal.health/..."
}
```

**Response:**
```json
{
  "name": "Grilled Chicken Salad",
  "calories": 680,
  "protein": 52,
  "carbs": 58,
  "fat": 22,
  "serving": "1 bowl (~400g)",
  "suggestedMealType": "lunch"
}
```

#### POST /api/ai/feedback
Rate AI response.

```json
{
  "messageId": "...",
  "rating": "up" | "down",
  "correction": "string (optional)"
}
```

### 5.5 Statistics

#### GET /api/stats?period=7D|30D|6M
Return aggregated data for charts.

### 5.6 Subscriptions

#### GET /api/subscriptions/plans
List available plans.

#### POST /api/subscriptions/checkout
Create Stripe checkout session.

#### POST /api/subscriptions/webhooks/stripe
Stripe webhook endpoint.

#### POST /api/subscriptions/cancel
Cancel current subscription at period end.

### 5.7 Marketplace

#### GET /api/programs
List programs with filters.

#### GET /api/programs/:id
Program details.

#### POST /api/programs/:id/enroll
Start enrollment and payment.

#### POST /api/marketplace/webhooks/stripe
Webhook for marketplace payments.

### 5.8 Admin

#### GET /api/admin/users
List users (paginated, searchable).

#### GET /api/admin/users/:id
User details.

#### GET /api/admin/ai/logs
AI request logs.

#### POST /api/admin/kb/articles
Create knowledge article.

#### GET /api/admin/kb/articles
List articles.

#### PATCH /api/admin/kb/articles/:id
Update article.

#### DELETE /api/admin/kb/articles/:id
Delete article.

#### POST /api/admin/skills/:id/prompts
Update skill prompt.

#### POST /api/admin/training-examples
Add training example.

---

## 6. Database Schema

### 6.1 Core Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  telegram_username TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  language_code TEXT DEFAULT 'en',
  region_code TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user', -- user, support, admin
  subscription_status TEXT DEFAULT 'inactive', -- active, trialing, canceled, past_due
  subscription_plan_id UUID,
  subscription_expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  birth_date DATE,
  gender TEXT,
  height_cm INT,
  current_weight_kg DECIMAL(5,2),
  target_weight_kg DECIMAL(5,2),
  primary_goal TEXT, -- fat_loss, muscle_gain, maintenance
  activity_level TEXT, -- sedentary, light, moderate, active, very_active
  dietary_preferences TEXT[],
  allergies TEXT[],
  daily_calories INT,
  daily_protein_g INT,
  daily_carbs_g INT,
  daily_fat_g INT,
  daily_water_ml INT,
  daily_sleep_h DECIMAL(3,1),
  daily_steps INT,
  timezone TEXT DEFAULT 'UTC',
  units TEXT DEFAULT 'metric',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscription plans
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  interval TEXT NOT NULL, -- monthly, six_month, yearly
  stripe_price_id TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  stripe_subscription_id TEXT,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Food logs
CREATE TABLE food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL,
  name TEXT NOT NULL,
  calories INT NOT NULL,
  protein_g INT,
  carbs_g INT,
  fat_g INT,
  image_url TEXT,
  ai_analyzed BOOLEAN DEFAULT false,
  logged_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activity logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  duration_min INT NOT NULL,
  calories_burned INT,
  started_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Metric logs (water, sleep, weight, steps)
CREATE TABLE metric_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- water_ml, sleep_h, weight_kg, steps
  value DECIMAL(10,2) NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user, ai, system
  type TEXT DEFAULT 'text', -- text, food-analysis, macro-card, voice
  content TEXT NOT NULL,
  attachments JSONB,
  model_used TEXT,
  tokens_input INT,
  tokens_output INT,
  latency_ms INT,
  feedback_rating TEXT,
  feedback_correction TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User memory / facts
CREATE TABLE user_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT, -- explicit, inferred, corrected
  confidence DECIMAL(3,2) DEFAULT 0.8,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Knowledge base
CREATE TABLE knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  source_url TEXT,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge chunks for RAG
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES knowledge_articles(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI skills
CREATE TABLE ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  tools TEXT[],
  allowed_models TEXT[],
  fallback_model TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Training examples (few-shot)
CREATE TABLE training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES ai_skills(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  context JSONB,
  source TEXT, -- manual, feedback, import
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Marketplace programs
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  instructor TEXT,
  category TEXT,
  description TEXT,
  duration_weeks INT,
  price_usd DECIMAL(10,2),
  includes TEXT[],
  level TEXT,
  rating DECIMAL(2,1),
  reviews_count INT DEFAULT 0,
  emoji TEXT,
  gradient TEXT,
  tag TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User enrollments
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  payment_status TEXT,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, program_id)
);

-- AI audit logs
CREATE TABLE ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  request_id TEXT,
  skill_name TEXT,
  model TEXT,
  provider TEXT,
  tokens_input INT,
  tokens_output INT,
  cost_usd DECIMAL(10,6),
  latency_ms INT,
  user_message TEXT,
  ai_response TEXT,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin staff invites
CREATE TABLE staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL, -- viewer, support, admin
  invited_by UUID REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. Backend Architecture

### 7.1 Services

| Service | Responsibility | Tech |
|---------|---------------|------|
| `api` | REST API, auth, tracking, payments | Node.js + Fastify |
| `ai-agent` | AI orchestration, skills, memory, RAG | Node.js + Fastify |
| `telegram-bot` | Bot entry, notifications, Mini App opener | Node.js + node-telegram-bot-api |
| `admin` | Admin website | React + Vite |
| `worker` | Background jobs: summarization, indexing, webhooks | Node.js + BullMQ |

### 7.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                 │
│   Telegram Mini App (PWA)       Admin Website       Telegram Bot    │
└───────────────────────┬─────────────────────┬────────────────────────┘
                        │                     │
                        ▼                     ▼
              ┌─────────────────┐     ┌───────────────┐
              │     Nginx       │────▶│  API Gateway  │
              │  (SSL, WAF)     │     │  (rate limit) │
              └────────┬────────┘     └───────┬───────┘
                       │                      │
                       ▼                      ▼
              ┌─────────────────┐     ┌───────────────┐
              │   API Service   │     │  AI Agent     │
              │  auth, tracking │     │  skills, RAG  │
              │  subscriptions  │     │  memory       │
              │  marketplace    │     │  tools        │
              └────────┬────────┘     └───────┬───────┘
                       │                      │
                       ▼                      ▼
              ┌─────────────────┐     ┌───────────────┐
              │   PostgreSQL    │     │     Redis     │
              │   (Prisma)      │     │ cache/sessions│
              │   pgvector      │     │ short memory  │
              └─────────────────┘     └───────┬───────┘
                                            │
                              ┌─────────────┼─────────────┐
                              ▼             ▼             ▼
                         ┌────────┐   ┌─────────┐   ┌─────────┐
                         │BullMQ  │   │OpenRouter│   │ Ollama  │
                         │Worker  │   │  proxy   │   │ fallback│
                         └────────┘   └─────────┘   └─────────┘
```

### 7.3 Scaling Strategy
- **Horizontal scaling:** stateless API/AI services behind Nginx load balancer.
- **Database:** PostgreSQL primary + read replicas; pgvector on primary.
- **Cache:** Redis cluster for sessions and rate limits.
- **Queues:** BullMQ with multiple worker instances.
- **CDN:** Static assets via Cloudflare / S3.
- **File storage:** S3-compatible for photos.

### 7.4 Key Backend Libraries
- Fastify
- Prisma ORM
- Zod (validation)
- @fastify/jwt
- @fastify/rate-limit
- BullMQ
- ioredis
- Stripe SDK
- axios / fetch for OpenRouter
- multer / sharp for image upload

---

## 8. AI Architecture

### 8.1 Skill-Based Agent

Each skill is a self-contained module:

```typescript
interface Skill {
  name: string;
  systemPrompt: string;
  tools: Tool[];
  examples: TrainingExample[];
  allowedModels: string[];
  fallbackModel: string;
  guardrails: Guardrail[];
}
```

### 8.2 Request Lifecycle

1. **Receive** user message + context.
2. **Classify intent** → select skill.
3. **Load context** from memory + DB + RAG.
4. **Execute tools** if needed (analyze photo, log food, search KB).
5. **Build prompt** from system prompt + context + examples + tool results.
6. **Call LLM** via OpenRouter with fallback to Ollama.
7. **Safety check** response.
8. **Save** to chat history + memory + audit log.
9. **Return** response to user.

### 8.3 Memory System

- **Short-term:** last 20 messages in Redis.
- **Long-term facts:** `user_facts` table.
- **Vector memory:** important phrases and knowledge in pgvector.
- **Daily summarization:** worker updates facts nightly.

### 8.4 RAG Pipeline

1. Embed query with nomic-embed-text / bge-m3.
2. Search `knowledge_chunks` via pgvector similarity.
3. If low confidence, optionally call web search (SearXNG / Tavily).
4. Combine top results into prompt context.

### 8.5 Guardrails

- Medical disclaimer on health advice.
- Block harmful content (extreme diets, steroids, etc.).
- Prompt injection detection.
- No system prompt leakage.
- Token and cost limits.

### 8.6 Feedback Loop

- User rates AI response.
- Corrections update `user_facts`.
- Bad responses become training examples.
- Admin reviews flagged responses.
- A/B testing of prompt versions.

### 8.7 Models

| Task | Primary | Fallback |
|------|---------|----------|
| Intent classification | OpenRouter Mistral 7B | Ollama Mistral |
| General chat | OpenRouter GPT-4o / Claude 3.5 | DeepSeek-V3 |
| Food photo analysis | OpenRouter GPT-4o Vision | Ollama LLaVA |
| Embeddings | OpenRouter/Ollama nomic-embed-text | bge-m3 |
| Voice transcription | OpenRouter Whisper | local Whisper |

---

## 9. Authentication & Authorization

### 9.1 Telegram Auth
- Verify `initData` using HMAC-SHA256 with Telegram bot token.
- Extract user info: `id`, `first_name`, `last_name`, `username`, `language_code`, `photo_url`.
- Auto-create user on first login.
- Issue JWT access token (15 min) + refresh token (7 days).

### 9.2 RBAC
- `user` — standard app access.
- `support` — view users, read chats, respond in support mode.
- `admin` — full access, staff management, AI config, KB management.
- `viewer` — read-only admin access.

### 9.3 Token Rotation
- Access token TTL: 15 minutes.
- Refresh token TTL: 7 days, single-use, stored hashed in Redis/DB.
- On refresh: invalidate old refresh, issue new pair.

### 9.4 Admin Invitation
- Admin invites staff by email.
- Token-based invitation link.
- New staff logs in via Telegram and gets assigned role.

---

## 10. Subscription & Payment Flow

### 10.1 Plans

| Plan | Price | Interval |
|------|-------|----------|
| Free | $0 | forever |
| Pro Monthly | $5 | 1 month |
| Pro 6 Months | $25 | 6 months |
| Pro Annual | $45 | 12 months |

### 10.2 Stripe Flow
1. User selects plan.
2. Backend creates Stripe Checkout Session.
3. User pays in Stripe.
4. Stripe webhook `checkout.session.completed` → activate subscription.
5. Stripe webhook `invoice.payment_failed` → mark past_due, notify user.
6. Cancel at period end via Stripe.

### 10.3 TON / Telegram Wallet
- Secondary payment method for marketplace.
- Implementation deferred to marketplace phase.

### 10.4 Trial
- 7-day free trial from first AI interaction.
- During trial: unlimited AI.
- After trial without subscription: 1 AI message/day.

### 10.5 Webhooks
- `POST /api/subscriptions/webhooks/stripe` — authenticated Stripe events.
- `POST /api/marketplace/webhooks/stripe` — marketplace payments.
- Idempotency via Stripe event ID.

---

## 11. Marketplace

### 11.1 Products
- Subscription-based digital fitness/nutrition programs.
- Admin creates programs with: name, instructor, category, duration, price, description, includes, level, rating, media.

### 11.2 Purchase Flow
1. User browses marketplace.
2. Opens program detail sheet.
3. Taps Enroll.
4. Payment via Stripe (primary) or TON (secondary).
5. Webhook confirms enrollment.
6. User sees enrolled programs.

### 11.3 Commission
- Deferred; admin can later configure platform fee %.

---

## 12. Admin Panel

### 12.1 Access
- Standalone website at `admin.snapcal.health`.
- Login via Telegram with RBAC.
- Staff roles: admin, support, viewer.

### 12.2 Sections
- **Dashboard:** users, revenue, AI usage, active subscriptions.
- **Users:** list, search, view profile, chat history, memory.
- **AI Center:**
  - Skills editor (system prompts, tools, models).
  - Knowledge Base manager.
  - Training examples.
  - A/B tests.
  - Audit logs.
- **Marketplace:** CRUD programs.
- **Subscriptions:** plans, transactions, cancellations.
- **Staff:** invite, manage roles.
- **Support:** view flagged responses, user feedback.

### 12.3 Admin Auth
- Telegram login + role check.
- MFA optional for admin role.

---

## 13. Notification System

### 13.1 Channels
- Telegram Bot messages (primary).
- Future: push notifications via FCM.

### 13.2 Notification Types
- Meal reminders.
- Water reminders.
- Workout reminders.
- AI insight of the day.
- Subscription renewal reminders.
- Payment failure.

### 13.3 Scheduling
- BullMQ cron jobs.
- User timezone aware.
- Opt-out per type in Profile → Settings.

---

## 14. Error, Loading & Empty States

### 14.1 Loading States
- Skeleton screens for Home, Activity, Stats.
- Spinner for AI typing.
- Shimmer for marketplace cards.

### 14.2 Empty States
- No activities: "No activities yet. Tap + to log your first activity."
- No meals: "No meals logged today. Ask AI Coach to analyze a photo."
- No stats: "Log more data to see your progress."
- No internet: "Connection lost. Changes will sync when you're back online."

### 14.3 Error States
- API error: toast/snackbar with retry.
- AI limit reached: paywall card.
- Photo analysis failed: "Could not analyze. Try again or enter manually."
- Payment failed: redirect to retry.
- Telegram auth failed: "Please reopen from Telegram Bot."

### 14.4 Offline Support
- PWA service worker caches static assets.
- Form data queued in IndexedDB, synced on reconnect.

---

## 15. Acceptance Criteria

### 15.1 Authentication
- [ ] New Telegram user can open Mini App and auto-create account in < 2s.
- [ ] Returning user lands on Home screen without re-entering data.
- [ ] Access token expires in 15 min; refresh token rotates correctly.
- [ ] Invalid Telegram hash is rejected with 401.

### 15.2 Home
- [ ] Calorie ring updates within 1s after logging food.
- [ ] All 6 metric cards visible and scrollable.
- [ ] Meals expand/collapse smoothly.
- [ ] AI insight card appears daily.

### 15.3 AI Coach
- [ ] Free user gets 7-day unlimited trial.
- [ ] After trial, free user can send only 1 message/day.
- [ ] Pro user can send unlimited messages.
- [ ] Food photo analysis returns calories + macros within 5s.
- [ ] AI remembers user preferences across sessions.
- [ ] Voice message transcribed and answered.

### 15.4 Activity
- [ ] User can add activity with type, duration, time.
- [ ] Timeline sorted by time.
- [ ] Delete removes activity and updates summary.

### 15.5 Statistics
- [ ] 7D, 30D, 6M period switching works.
- [ ] Charts render within 2s.
- [ ] AI insights based on real aggregated data.

### 15.6 Subscription
- [ ] Stripe checkout creates subscription.
- [ ] Webhook updates user to Pro immediately.
- [ ] Cancel at period end works.

### 15.7 Marketplace
- [ ] Programs filter by category.
- [ ] Enroll triggers payment.
- [ ] Enrolled program marked correctly.

### 15.8 Admin
- [ ] Admin can create KB article and it becomes searchable by AI.
- [ ] Admin can edit skill prompt and A/B test it.
- [ ] Support can view user chat history.
- [ ] Viewer cannot modify data.

---

## 16. Security & Compliance

### 16.1 OWASP ASVS / MASVS
- Secure authentication (JWT + refresh rotation).
- Input validation with Zod on all endpoints.
- Parameterized queries via Prisma (SQL injection prevention).
- XSS: React escapes output; CSP headers.
- CSRF: SameSite cookies, Telegram initData verification.
- Secure file upload: image size/type limits, virus scan placeholder, S3 presigned URLs.
- Rate limiting per IP and user.
- Secrets management: `.env`, no hardcoded secrets, rotation policy.

### 16.2 AI Security
- **Prompt injection:** input sanitization, system prompt isolation, output filtering.
- **Prompt leakage:** never return system prompt; separate instruction layer.
- **Cost protection:** per-user daily budgets, max tokens per request, OpenRouter proxy.
- **Abuse protection:** rate limits, anomaly detection on token usage.
- **Audit logging:** every AI request logged with user, model, cost, latency, content.
- **Model access control:** backend-only API keys, never exposed to client.

### 16.3 Payment Security
- No card data stored; use Stripe Checkout / Tokens.
- Webhook signature verification.
- Idempotent event processing.

### 16.4 GDPR
- Explicit consent during onboarding.
- Right to access, export, delete account and data.
- Data retention policy (delete inactive accounts after 2 years configurable).
- Encrypted data at rest and in transit.
- Privacy policy and terms available in app.

### 16.5 Infrastructure Security
- TLS 1.3 enforced.
- WAF rules on Nginx / Cloudflare.
- DDoS protection via Cloudflare / provider.
- Network segmentation: DB and Redis not public.
- Regular dependency scanning (`npm audit`, Snyk).
- Automated backups encrypted.

---

## 17. Deployment & Operations

### 17.1 CI/CD Pipeline

```
feature/* → PR → develop branch
    ↓
GitHub Actions: lint, typecheck, tests
    ↓
Docker build → push to registry
    ↓
deploy to test (port 5175)
    ↓
merge develop → test → staging (port 5174)
    ↓
merge staging → main → production (port 5173)
```

### 17.2 Docker & Compose
- `docker-compose.yml` for local dev.
- `docker-compose.prod.yml` for DO droplet.
- Separate containers per service.

### 17.3 Deployment Strategy
- Blue-green via two PM2 app groups.
- Health checks before traffic switch.
- Automatic rollback if health check fails.
- Zero-downtime with Nginx upstream switch.

### 17.4 Monitoring
- Prometheus metrics from API and AI services.
- Grafana dashboards: requests, errors, AI cost, subscriptions.
- Sentry for error tracking.
- Loki or filebeat for log aggregation.
- Uptime monitoring via external service.

### 17.5 Disaster Recovery
- Daily encrypted DB backups to S3.
- Redis persistent snapshots.
- Documented runbook for restore.
- RPO: 24h, RTO: 4h.

### 17.6 Environments

| Env | Branch | URL / Port |
|-----|--------|------------|
| Local | feature/* | localhost:5173 |
| Test | test | http://157.230.113.0:5175 |
| Staging | staging | http://157.230.113.0:5174 |
| Production | main | https://snapcal.health |

---

## Appendices

### A. Glossary
- **PWA:** Progressive Web App.
- **Mini App:** Application inside Telegram messenger.
- **RAG:** Retrieval-Augmented Generation.
- **RBAC:** Role-Based Access Control.
- **TTL:** Time To Live.

### B. Future Enhancements
- Native iOS/Android apps.
- Wearable integrations.
- Social features / challenges.
- Advanced AI-generated meal plans.
- Multi-currency support.
- Expert creator dashboard.
