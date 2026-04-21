CREATE TYPE user_role         AS ENUM ('citoyen', 'municipal_agent', 'employee');

CREATE TYPE employee_role     AS ENUM ('municipal_agent', 'employee');

CREATE TYPE employee_status   AS ENUM ('active', 'inactive');

CREATE TYPE document_type     AS ENUM ('extrait_naissance', 'carte_sejour', 'certificat_residence', 'contrat_mariage','authorisation_de_voirie');

CREATE TYPE demande_status    AS ENUM ('en_attente', 'en_cours', 'termine', 'refuse');

CREATE TYPE request_status    AS ENUM ('pending', 'in_progress', 'completed', 'rejected');

CREATE TYPE document_status   AS ENUM ('pending', 'valid', 'missing', 'rejected');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    nin VARCHAR(18) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    telephone VARCHAR(20) NOT NULL,
    adresse TEXT NOT NULL,
    code_postal VARCHAR(10) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'citoyen',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE citizens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    nin VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role employee_role NOT NULL DEFAULT 'employee',
    service VARCHAR(150),
    position VARCHAR(150),
    phone VARCHAR(20),
    join_date DATE,
    status employee_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE demandes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type_document document_type NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    nin VARCHAR(20) NOT NULL,
    wilaya_naissance VARCHAR(100),
    commune VARCHAR(100),
    date_naissance DATE,
    photo_cni_path VARCHAR(500),
    photo_domicile_path VARCHAR(500),
    status demande_status NOT NULL DEFAULT 'en_attente',
    date_demande TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_traitement TIMESTAMPTZ,
    commentaire TEXT
);

CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    citizen_id UUID REFERENCES citizens (id) ON DELETE SET NULL,
    citizen_first_name VARCHAR(100),
    citizen_last_name VARCHAR(100),
    citizen_email VARCHAR(255),
    citizen_nin VARCHAR(20),
    citizen_address TEXT,
    subject TEXT,
    description TEXT,
    assigned_to UUID REFERENCES employees (id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES employees (id) ON DELETE SET NULL,
    assigned_employee_name VARCHAR(200),
    status request_status NOT NULL DEFAULT 'pending',
    document_status document_status NOT NULL DEFAULT 'pending',
    comment TEXT NOT NULL DEFAULT '',
    notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
    notification_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    employee_id UUID REFERENCES employees (id) ON DELETE CASCADE,
    service VARCHAR(150),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_role    VARCHAR(20) NOT NULL CHECK (from_role IN ('citizen', 'agent')),
    message      TEXT NOT NULL,
    is_read      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE INDEX idx_chat_citizen_id  ON chat_messages(citizen_id);
CREATE INDEX idx_chat_created_at  ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_from_role   ON chat_messages(from_role);
CREATE INDEX idx_users_role ON users (role);

CREATE INDEX idx_demandes_user_id ON demandes (user_id);

CREATE INDEX idx_demandes_status ON demandes (status);

CREATE INDEX idx_demandes_nin ON demandes (nin);

CREATE INDEX idx_demandes_date ON demandes (date_demande DESC);

CREATE INDEX idx_requests_citizen_id ON requests (citizen_id);

CREATE INDEX idx_requests_assigned_to ON requests (assigned_to);

CREATE INDEX idx_requests_status ON requests (status);

CREATE INDEX idx_requests_doc_status ON requests (document_status);

CREATE INDEX idx_requests_created_at ON requests (created_at DESC);

CREATE INDEX idx_requests_notification ON requests (
    notification_sent,
    notification_read
);

CREATE INDEX idx_notifications_employee ON notifications (employee_id);

CREATE INDEX idx_notifications_is_read ON notifications (is_read);

CREATE INDEX idx_notifications_type    ON notifications(type);

CREATE INDEX idx_notifications_created ON notifications (created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_citizens_updated_at
  BEFORE UPDATE ON citizens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();