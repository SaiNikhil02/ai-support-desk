import os
from datetime import date, datetime

from flask import Flask, jsonify, render_template, request
from psycopg.rows import dict_row

from database import get_connection


app = Flask(__name__)


def serialize_row(row: dict) -> dict:
    """
    Convert PostgreSQL date/time values into JSON-safe strings.
    """

    serialized = {}

    for key, value in row.items():
        if isinstance(value, (datetime, date)):
            serialized[key] = value.isoformat()
        else:
            serialized[key] = value

    return serialized


@app.get("/")
def home():
    return render_template("index.html")
    

@app.get("/api/db-check")
def database_check():
    """
    Verify that the app can connect to Lakebase and read both tables.
    """

    try:
        with get_connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT
                        current_user AS database_user,
                        current_database() AS database,
                        (
                            SELECT COUNT(*)
                            FROM support_app.tickets
                        ) AS ticket_count,
                        (
                            SELECT COUNT(*)
                            FROM support_app.ticket_messages
                        ) AS message_count
                    """
                )

                row = cursor.fetchone()

        return jsonify(
            {
                "connected": True,
                **serialize_row(row),
            }
        )

    except Exception as error:
        app.logger.exception("Lakebase connection test failed")

        return (
            jsonify(
                {
                    "connected": False,
                    "error": str(error),
                }
            ),
            500,
        )


@app.get("/api/tickets")
def get_tickets():
    """
    Return every support ticket with its number of messages.
    """

    try:
        with get_connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT
                        t.ticket_id,
                        t.title,
                        t.status,
                        t.created_by,
                        t.created_at,
                        COUNT(m.message_id) AS message_count
                    FROM support_app.tickets AS t
                    LEFT JOIN support_app.ticket_messages AS m
                        ON t.ticket_id = m.ticket_id
                    GROUP BY
                        t.ticket_id,
                        t.title,
                        t.status,
                        t.created_by,
                        t.created_at
                    ORDER BY t.created_at DESC, t.ticket_id DESC
                    """
                )

                rows = cursor.fetchall()

        return jsonify(
            {
                "tickets": [
                    serialize_row(row)
                    for row in rows
                ]
            }
        )

    except Exception as error:
        app.logger.exception("Failed to load tickets")

        return (
            jsonify(
                {
                    "error": "Unable to load support tickets.",
                    "details": str(error),
                }
            ),
            500,
        )


@app.get("/api/tickets/<int:ticket_id>")
def get_ticket(ticket_id: int):
    """
    Return one ticket and all messages belonging to it.
    """

    try:
        with get_connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT
                        ticket_id,
                        title,
                        status,
                        created_by,
                        created_at
                    FROM support_app.tickets
                    WHERE ticket_id = %s
                    """,
                    (ticket_id,),
                )

                ticket = cursor.fetchone()

                if ticket is None:
                    return (
                        jsonify(
                            {
                                "error": f"Ticket {ticket_id} was not found."
                            }
                        ),
                        404,
                    )

                cursor.execute(
                    """
                    SELECT
                        message_id,
                        ticket_id,
                        message_text,
                        author,
                        created_at
                    FROM support_app.ticket_messages
                    WHERE ticket_id = %s
                    ORDER BY created_at, message_id
                    """,
                    (ticket_id,),
                )

                messages = cursor.fetchall()

        return jsonify(
            {
                "ticket": serialize_row(ticket),
                "messages": [
                    serialize_row(message)
                    for message in messages
                ],
            }
        )

    except Exception as error:
        app.logger.exception(
            "Failed to load ticket %s",
            ticket_id,
        )

        return (
            jsonify(
                {
                    "error": "Unable to load the ticket.",
                    "details": str(error),
                }
            ),
            500,
        )



@app.post("/api/tickets")
def create_ticket():
    """
    Create a support ticket and store it permanently in Lakebase.
    """

    data = request.get_json(silent=True) or {}

    title = str(data.get("title", "")).strip()
    created_by = str(data.get("created_by", "")).strip()
    status = str(data.get("status", "open")).strip().lower()

    allowed_statuses = {
        "open",
        "in_progress",
        "resolved",
    }

    if not title:
        return (
            jsonify(
                {
                    "error": "Ticket title is required."
                }
            ),
            400,
        )

    if len(title) > 200:
        return (
            jsonify(
                {
                    "error": "Ticket title cannot exceed 200 characters."
                }
            ),
            400,
        )

    if not created_by:
        return (
            jsonify(
                {
                    "error": "Created-by value is required."
                }
            ),
            400,
        )

    if status not in allowed_statuses:
        return (
            jsonify(
                {
                    "error": (
                        "Status must be open, "
                        "in_progress, or resolved."
                    )
                }
            ),
            400,
        )

    try:
        with get_connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    INSERT INTO support_app.tickets (
                        title,
                        status,
                        created_by
                    )
                    VALUES (%s, %s, %s)
                    RETURNING
                        ticket_id,
                        title,
                        status,
                        created_by,
                        created_at
                    """,
                    (
                        title,
                        status,
                        created_by,
                    ),
                )

                ticket = cursor.fetchone()

            connection.commit()

        return (
            jsonify(
                {
                    "message": "Ticket created successfully.",
                    "ticket": serialize_row(ticket),
                }
            ),
            201,
        )

    except Exception as error:
        app.logger.exception("Failed to create ticket")

        return (
            jsonify(
                {
                    "error": "Unable to create the ticket.",
                    "details": str(error),
                }
            ),
            500,
        )


@app.post("/api/tickets/<int:ticket_id>/messages")
def add_ticket_message(ticket_id: int):
    """
    Add a message to an existing support ticket.
    """

    data = request.get_json(silent=True) or {}

    message_text = str(
        data.get("message_text", "")
    ).strip()

    author = str(
        data.get("author", "")
    ).strip()

    if not message_text:
        return (
            jsonify(
                {
                    "error": "Message text is required."
                }
            ),
            400,
        )

    if len(message_text) > 5000:
        return (
            jsonify(
                {
                    "error": (
                        "Message text cannot exceed "
                        "5000 characters."
                    )
                }
            ),
            400,
        )

    if not author:
        return (
            jsonify(
                {
                    "error": "Message author is required."
                }
            ),
            400,
        )

    try:
        with get_connection() as connection:
            with connection.cursor(
                row_factory=dict_row
            ) as cursor:

                # Confirm the parent ticket exists.
                cursor.execute(
                    """
                    SELECT ticket_id
                    FROM support_app.tickets
                    WHERE ticket_id = %s
                    """,
                    (ticket_id,),
                )

                ticket = cursor.fetchone()

                if ticket is None:
                    return (
                        jsonify(
                            {
                                "error": (
                                    f"Ticket {ticket_id} "
                                    "was not found."
                                )
                            }
                        ),
                        404,
                    )

                cursor.execute(
                    """
                    INSERT INTO support_app.ticket_messages (
                        ticket_id,
                        message_text,
                        author
                    )
                    VALUES (%s, %s, %s)
                    RETURNING
                        message_id,
                        ticket_id,
                        message_text,
                        author,
                        created_at
                    """,
                    (
                        ticket_id,
                        message_text,
                        author,
                    ),
                )

                message = cursor.fetchone()

            connection.commit()

        return (
            jsonify(
                {
                    "message": (
                        "Message added successfully."
                    ),
                    "ticket_message": serialize_row(
                        message
                    ),
                }
            ),
            201,
        )

    except Exception as error:
        app.logger.exception(
            "Failed to add a message to ticket %s",
            ticket_id,
        )

        return (
            jsonify(
                {
                    "error": (
                        "Unable to add the message."
                    ),
                    "details": str(error),
                }
            ),
            500,
        )


@app.patch("/api/tickets/<int:ticket_id>/status")
def update_ticket_status(ticket_id: int):
    """
    Update the status of an existing support ticket.
    """

    data = request.get_json(silent=True) or {}

    status = str(
        data.get("status", "")
    ).strip().lower()

    allowed_statuses = {
        "open",
        "in_progress",
        "resolved",
    }

    if not status:
        return (
            jsonify(
                {
                    "error": "Ticket status is required."
                }
            ),
            400,
        )

    if status not in allowed_statuses:
        return (
            jsonify(
                {
                    "error": (
                        "Status must be open, "
                        "in_progress, or resolved."
                    )
                }
            ),
            400,
        )

    try:
        with get_connection() as connection:
            with connection.cursor(
                row_factory=dict_row
            ) as cursor:

                cursor.execute(
                    """
                    UPDATE support_app.tickets
                    SET status = %s
                    WHERE ticket_id = %s
                    RETURNING
                        ticket_id,
                        title,
                        status,
                        created_by,
                        created_at
                    """,
                    (
                        status,
                        ticket_id,
                    ),
                )

                ticket = cursor.fetchone()

                if ticket is None:
                    return (
                        jsonify(
                            {
                                "error": (
                                    f"Ticket {ticket_id} "
                                    "was not found."
                                )
                            }
                        ),
                        404,
                    )

            connection.commit()

        return jsonify(
            {
                "message": (
                    "Ticket status updated successfully."
                ),
                "ticket": serialize_row(ticket),
            }
        )

    except Exception as error:
        app.logger.exception(
            "Failed to update ticket %s",
            ticket_id,
        )

        return (
            jsonify(
                {
                    "error": (
                        "Unable to update ticket status."
                    ),
                    "details": str(error),
                }
            ),
            500,
        )


if __name__ == "__main__":
    port = int(
        os.environ.get(
            "DATABRICKS_APP_PORT",
            "8000",
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False,
    )