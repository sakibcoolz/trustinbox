-- ============================================================
-- 009: User career details — work experience, education, skills
-- ============================================================

CREATE TABLE user_work_experience (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_title   VARCHAR(255) NOT NULL,
    company     VARCHAR(255) NOT NULL,
    industry    VARCHAR(255),
    location    VARCHAR(255),
    start_date  DATE NOT NULL,
    end_date    DATE,
    is_current  BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_exp_user_id ON user_work_experience(user_id);

CREATE TABLE user_education (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school      VARCHAR(255) NOT NULL,
    degree      VARCHAR(255),
    field       VARCHAR(255),
    start_year  SMALLINT NOT NULL,
    end_year    SMALLINT,
    is_current  BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_education_user_id ON user_education(user_id);

CREATE TABLE user_skills (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name  VARCHAR(100) NOT NULL,
    level       VARCHAR(50),   -- BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
    category    VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skills_user_id ON user_skills(user_id);
