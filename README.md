# AI Support Desk — Lakebase-Powered Databricks App

A small internal support-ticket application built with **Databricks Apps**, **Flask**, and **Databricks Lakebase PostgreSQL**.

The application allows users to:

- View all support tickets
- Select a ticket and view its messages
- Create a new ticket
- Add a message to an existing ticket
- Update a ticket's status
- Persist all changes in Lakebase

## Live Application

**Databricks App URL:**  
https://hello-world-7474660373472810.aws.databricksapps.com

> Access may be restricted to authorized users in the Databricks workspace.

## Project Architecture

```text
User Browser
     |
     v
Databricks App
Flask + HTML/CSS/JavaScript
     |
     v
Lakebase PostgreSQL
     |
     +-- support_app.tickets
     |
     +-- support_app.ticket_messages
```

Lakebase stores the operational application data, while the Flask application exposes REST endpoints that the browser uses to read and update ticket information.

## Main Features

### Ticket management

- Display all support tickets
- Show ticket title, creator, status, creation time, and message count
- Create new support tickets
- Update ticket status to:
  - `open`
  - `in_progress`
  - `resolved`

### Message management

- Display the conversation for a selected ticket
- Add new messages to an existing ticket
- Preserve messages after browser refreshes and application redeployments

### Validation and reliability

- Required-field validation
- Maximum title and message lengths
- Allowed-status validation
- Parameterized SQL queries
- PostgreSQL primary keys and foreign keys
- Explicit database transaction commits
- Helpful API error responses

## Technology Stack

- **Databricks Apps** — application hosting and deployment
- **Databricks Lakebase Autoscaling** — managed PostgreSQL database
- **Flask** — Python web framework
- **psycopg** — PostgreSQL database client
- **Databricks SDK** — short-lived Lakebase database credentials
- **HTML, CSS, and JavaScript** — user interface
- **PostgreSQL SQL** — schema, constraints, and data operations

## Database Schema

The application uses the `support_app` schema.

### `support_app.tickets`

| Column | Type | Description |
|---|---|---|
| `ticket_id` | `BIGINT` | Auto-generated primary key |
| `title` | `VARCHAR(200)` | Ticket title |
| `status` | `VARCHAR(30)` | `open`, `in_progress`, or `resolved` |
| `created_by` | `VARCHAR(255)` | Ticket creator |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp |

### `support_app.ticket_messages`

| Column | Type | Description |
|---|---|---|
| `message_id` | `BIGINT` | Auto-generated primary key |
| `ticket_id` | `BIGINT` | Foreign key referencing `tickets.ticket_id` |
| `message_text` | `TEXT` | Message body |
| `author` | `VARCHAR(255)` | Message author |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp |

The foreign key uses `ON DELETE CASCADE`, so deleting a ticket also deletes its related messages.

## Repository Structure

```text
.
├── app.py
├── app.yaml
├── database.py
├── manifest.yaml
├── requirements.txt
├── schema.sql
├── seed.sql
├── static/
│   ├── app.js
│   └── styles.css
└── templates/
    └── index.html
```

## File Descriptions

- `app.py` — Flask routes and API endpoints
- `database.py` — secure Lakebase connection helper
- `app.yaml` — Databricks App startup command and resource mapping
- `manifest.yaml` — Databricks application metadata
- `requirements.txt` — Python dependencies
- `schema.sql` — PostgreSQL schema, tables, constraints, and index
- `seed.sql` — required sample tickets and messages
- `templates/index.html` — application page layout
- `static/app.js` — browser-side API calls and UI behavior
- `static/styles.css` — visual design and responsive layout

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/db-check` | Test the Lakebase connection |
| `GET` | `/api/tickets` | Return all tickets |
| `GET` | `/api/tickets/<ticket_id>` | Return one ticket and its messages |
| `POST` | `/api/tickets` | Create a ticket |
| `POST` | `/api/tickets/<ticket_id>/messages` | Add a message |
| `PATCH` | `/api/tickets/<ticket_id>/status` | Update ticket status |

## Sample Data

The `seed.sql` file creates at least:

- Three support tickets
- Two messages for each sample ticket
- Multiple statuses, including:
  - `open`
  - `in_progress`
  - `resolved`

Example sample tickets:

1. Unable to connect to company VPN
2. Laptop running slowly
3. Request access to finance dashboard

Run the seed script only once unless the database has been cleared, because repeated execution can create duplicate sample rows.

## Lakebase Setup

1. Create a Lakebase Autoscaling project.
2. Use the `production` branch.
3. Use the `databricks_postgres` database.
4. Open the Lakebase SQL Editor.
5. Run `schema.sql`.
6. Run `seed.sql`.
7. Attach the Lakebase database to the Databricks App as an app resource.
8. Grant the app's PostgreSQL role access to the `support_app` schema.

Example grants:

```sql
GRANT CONNECT
ON DATABASE databricks_postgres
TO "<APP_POSTGRES_ROLE>";

GRANT USAGE
ON SCHEMA support_app
TO "<APP_POSTGRES_ROLE>";

GRANT SELECT, INSERT, UPDATE
ON ALL TABLES IN SCHEMA support_app
TO "<APP_POSTGRES_ROLE>";

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA support_app
TO "<APP_POSTGRES_ROLE>";
```

Replace `<APP_POSTGRES_ROLE>` with the Databricks App service principal client ID.

## Application Deployment

1. Create a Databricks App.
2. Select a Flask template or create a custom app.
3. Attach the Lakebase database resource.
4. Upload or select this source folder.
5. Deploy the application.
6. Wait until the status becomes **Active**.
7. Open the generated Databricks Apps URL.

The application startup command is defined in `app.yaml`:

```yaml
command:
  - python
  - app.py

env:
  - name: ENDPOINT_NAME
    valueFrom: postgres
```

The `postgres` value must match the Lakebase app-resource key.

## Secure Authentication

No database password is stored in the repository.

The application:

1. Reads Databricks-provided `PG*` environment variables.
2. Uses the Databricks SDK to generate a short-lived Lakebase credential.
3. Passes that temporary credential to `psycopg`.
4. Connects securely using SSL.

This avoids hard-coded passwords, API keys, and long-lived database credentials.

## Local Development

Install the dependencies:

```bash
pip install -r requirements.txt
```

The application expects Databricks/Lakebase environment variables and authentication. Local execution therefore requires equivalent PostgreSQL connection configuration and Databricks SDK authentication.

Run the Flask app:

```bash
python app.py
```

The default local port is `8000`.

## Verification Queries

### Verify tickets and message counts

```sql
SELECT
    t.ticket_id,
    t.title,
    t.status,
    t.created_by,
    COUNT(m.message_id) AS message_count
FROM support_app.tickets AS t
LEFT JOIN support_app.ticket_messages AS m
    ON m.ticket_id = t.ticket_id
GROUP BY
    t.ticket_id,
    t.title,
    t.status,
    t.created_by
ORDER BY t.ticket_id;
```

### Verify messages

```sql
SELECT
    m.message_id,
    m.ticket_id,
    t.title,
    m.message_text,
    m.author,
    m.created_at
FROM support_app.ticket_messages AS m
JOIN support_app.tickets AS t
    ON t.ticket_id = m.ticket_id
ORDER BY
    m.ticket_id,
    m.message_id;
```


## Reflection

The most difficult part was configuring the Databricks App service principal to securely authenticate with Lakebase and access tables created under a different PostgreSQL role. Lakebase differs from a traditional analytics table because it is designed for low-latency operational transactions such as creating tickets, adding messages, and updating statuses, while analytics tables are optimized for large-scale reporting and historical processing. I used parameterized SQL, database constraints, input validation, and short-lived credentials to make the application reliable and secure. The next feature I would add is an AI assistant that summarizes ticket conversations and suggests responses based on previously resolved cases.

