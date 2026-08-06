INSERT INTO support_app.tickets (
    title,
    status,
    created_by
)
VALUES
    (
        'Unable to connect to company VPN',
        'open',
        'alice@example.com'
    ),
    (
        'Laptop running slowly',
        'in_progress',
        'bob@example.com'
    ),
    (
        'Request access to finance dashboard',
        'resolved',
        'carol@example.com'
    );

INSERT INTO support_app.ticket_messages (
    ticket_id,
    message_text,
    author
)
SELECT
    ticket_id,
    message_text,
    author
FROM (
    VALUES
        (
            'Unable to connect to company VPN',
            'The VPN client displays an authentication error.',
            'alice@example.com'
        ),
        (
            'Unable to connect to company VPN',
            'Please reset your password and try connecting again.',
            'support@example.com'
        ),
        (
            'Laptop running slowly',
            'The laptop freezes when multiple applications are open.',
            'bob@example.com'
        ),
        (
            'Laptop running slowly',
            'We are checking the device memory and disk utilization.',
            'support@example.com'
        ),
        (
            'Request access to finance dashboard',
            'I need read-only access to the finance dashboard.',
            'carol@example.com'
        ),
        (
            'Request access to finance dashboard',
            'Read-only access has been granted.',
            'support@example.com'
        )
) AS sample(ticket_title, message_text, author)
JOIN support_app.tickets AS ticket
    ON ticket.title = sample.ticket_title;