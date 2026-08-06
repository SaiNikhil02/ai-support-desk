CREATE SCHEMA IF NOT EXISTS support_app;

CREATE TABLE IF NOT EXISTS support_app.tickets (
    ticket_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_ticket_status
        CHECK (
            status IN (
                'open',
                'in_progress',
                'resolved'
            )
        )
);

CREATE TABLE IF NOT EXISTS support_app.ticket_messages (
    message_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    message_text TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ticket_messages_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES support_app.tickets(ticket_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id
    ON support_app.ticket_messages(ticket_id);