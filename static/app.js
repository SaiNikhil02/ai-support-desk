const ticketList = document.getElementById("ticket-list");
const ticketSummary = document.getElementById("ticket-summary");
const refreshButton = document.getElementById("refresh-button");

const emptyState = document.getElementById("empty-state");
const ticketDetails = document.getElementById("ticket-details");
const errorMessage = document.getElementById("error-message");

const ticketNumber = document.getElementById("ticket-number");
const ticketTitle = document.getElementById("ticket-title");
const ticketCreatedBy = document.getElementById("ticket-created-by");
const ticketStatus = document.getElementById("ticket-status");

const messageSummary = document.getElementById("message-summary");
const messageList = document.getElementById("message-list");


const newTicketButton =
    document.getElementById("new-ticket-button");

const newTicketPanel =
    document.getElementById("new-ticket-panel");

const newTicketForm =
    document.getElementById("new-ticket-form");

const cancelTicketButton =
    document.getElementById("cancel-ticket-button");

const cancelTicketFormButton =
    document.getElementById("cancel-ticket-form-button");

const createTicketButton =
    document.getElementById("create-ticket-button");

const ticketTitleInput =
    document.getElementById("ticket-title-input");

const createdByInput =
    document.getElementById("created-by-input");

const ticketStatusInput =
    document.getElementById("ticket-status-input");

const successMessage =
    document.getElementById("success-message");


const newMessageForm =
    document.getElementById("new-message-form");

const messageTextInput =
    document.getElementById("message-text-input");

const messageAuthorInput =
    document.getElementById("message-author-input");

const addMessageButton =
    document.getElementById("add-message-button");

const messageSuccess =
    document.getElementById("message-success");



const statusSelect =
    document.getElementById("status-select");

const updateStatusButton =
    document.getElementById("update-status-button");

const statusSuccess =
    document.getElementById("status-success");

let selectedTicketId = null;


function formatDate(dateValue) {
    if (!dateValue) {
        return "Unknown date";
    }

    const date = new Date(dateValue);

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}


function formatStatus(status) {
    return status
        .replaceAll("_", " ")
        .replace(/\b\w/g, character => character.toUpperCase());
}


function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
}


function clearError() {
    errorMessage.textContent = "";
    errorMessage.classList.add("hidden");
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.remove("hidden");
}

function showMessageSuccess(message) {
    messageSuccess.textContent = message;
    messageSuccess.classList.remove("hidden");
}


function showStatusSuccess(message) {
    statusSuccess.textContent = message;
    statusSuccess.classList.remove("hidden");
}


function clearStatusSuccess() {
    statusSuccess.textContent = "";
    statusSuccess.classList.add("hidden");
}

function clearMessageSuccess() {
    messageSuccess.textContent = "";
    messageSuccess.classList.add("hidden");
}

function clearSuccess() {
    successMessage.textContent = "";
    successMessage.classList.add("hidden");
}


function openNewTicketForm() {
    clearError();
    clearSuccess();

    newTicketPanel.classList.remove("hidden");
    ticketTitleInput.focus();
}


function closeNewTicketForm() {
    newTicketPanel.classList.add("hidden");
    newTicketForm.reset();
    ticketStatusInput.value = "open";
}




function createTicketCard(ticket) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "ticket-card";
    button.dataset.ticketId = ticket.ticket_id;

    if (ticket.ticket_id === selectedTicketId) {
        button.classList.add("selected");
    }

    const topRow = document.createElement("div");
    topRow.className = "ticket-card-top";

    const ticketId = document.createElement("span");
    ticketId.className = "small-ticket-number";
    ticketId.textContent = `Ticket #${ticket.ticket_id}`;

    const status = document.createElement("span");
    status.className = `status-badge status-${ticket.status}`;
    status.textContent = formatStatus(ticket.status);

    topRow.append(ticketId, status);

    const title = document.createElement("h3");
    title.textContent = ticket.title;

    const footer = document.createElement("div");
    footer.className = "ticket-card-footer";

    const creator = document.createElement("span");
    creator.textContent = ticket.created_by;

    const count = document.createElement("span");
    count.textContent =
        `${ticket.message_count} message` +
        `${ticket.message_count === 1 ? "" : "s"}`;

    footer.append(creator, count);

    button.append(topRow, title, footer);

    button.addEventListener("click", () => {
        loadTicket(ticket.ticket_id);
    });

    return button;
}


function renderTicketList(tickets) {
    ticketList.replaceChildren();

    ticketSummary.textContent =
        `${tickets.length} support ticket` +
        `${tickets.length === 1 ? "" : "s"}`;

    if (tickets.length === 0) {
        const emptyCard = document.createElement("div");
        emptyCard.className = "loading-card";
        emptyCard.textContent = "No support tickets were found.";

        ticketList.appendChild(emptyCard);
        return;
    }

    for (const ticket of tickets) {
        ticketList.appendChild(createTicketCard(ticket));
    }
}


function renderMessages(messages) {
    messageList.replaceChildren();

    messageSummary.textContent =
        `${messages.length} message` +
        `${messages.length === 1 ? "" : "s"}`;

    if (messages.length === 0) {
        const emptyMessages = document.createElement("div");
        emptyMessages.className = "empty-messages";
        emptyMessages.textContent =
            "No messages have been added to this ticket.";

        messageList.appendChild(emptyMessages);
        return;
    }

    for (const message of messages) {
        const messageCard = document.createElement("article");
        messageCard.className = "message-card";

        const header = document.createElement("div");
        header.className = "message-header";

        const author = document.createElement("strong");
        author.textContent = message.author;

        const date = document.createElement("time");
        date.textContent = formatDate(message.created_at);

        header.append(author, date);

        const text = document.createElement("p");
        text.textContent = message.message_text;

        messageCard.append(header, text);
        messageList.appendChild(messageCard);
    }
}


function renderTicketDetails(data) {
    const ticket = data.ticket;

    emptyState.classList.add("hidden");
    ticketDetails.classList.remove("hidden");

    ticketNumber.textContent = `Ticket #${ticket.ticket_id}`;
    ticketTitle.textContent = ticket.title;

    ticketCreatedBy.textContent =
        `Created by ${ticket.created_by} · ` +
        `${formatDate(ticket.created_at)}`;

    ticketStatus.textContent = formatStatus(ticket.status);
    ticketStatus.className =
        `status-badge status-${ticket.status}`;

    statusSelect.value = ticket.status;

    renderMessages(data.messages);
}


async function loadTickets(selectFirstTicket = true) {
    clearError();

    ticketList.innerHTML = `
        <div class="loading-card">
            Loading tickets from Lakebase...
        </div>
    `;

    try {
        const response = await fetch("/api/tickets");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to load support tickets."
            );
        }

        renderTicketList(data.tickets);

        if (
            selectFirstTicket &&
            data.tickets.length > 0
        ) {
            await loadTicket(data.tickets[0].ticket_id);
        }
    } catch (error) {
        ticketList.replaceChildren();
        ticketSummary.textContent = "Unable to load tickets";
        showError(error.message);
    }
}


async function loadTicket(ticketId) {
    clearError();
    clearMessageSuccess();
    clearStatusSuccess();
    selectedTicketId = ticketId;

    ticketDetails.classList.add("hidden");
    emptyState.classList.remove("hidden");

    emptyState.innerHTML = `
        <div class="empty-icon">⏳</div>
        <h2>Loading ticket</h2>
        <p>Reading the conversation from Lakebase...</p>
    `;

    try {
        const response = await fetch(`/api/tickets/${ticketId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to load the ticket."
            );
        }

        renderTicketDetails(data);

        document
            .querySelectorAll(".ticket-card")
            .forEach(card => {
                card.classList.toggle(
                    "selected",
                    Number(card.dataset.ticketId) === ticketId
                );
            });

    } catch (error) {
        emptyState.classList.remove("hidden");

        emptyState.innerHTML = `
            <div class="empty-icon">⚠️</div>
            <h2>Ticket could not be loaded</h2>
            <p>Please refresh and try again.</p>
        `;

        showError(error.message);
    }
}


refreshButton.addEventListener("click", async () => {
    await loadTickets(false);

    if (selectedTicketId !== null) {
        await loadTicket(selectedTicketId);
    }
});

newTicketButton.addEventListener("click", () => {
    openNewTicketForm();
});


cancelTicketButton.addEventListener("click", () => {
    closeNewTicketForm();
});


cancelTicketFormButton.addEventListener("click", () => {
    closeNewTicketForm();
});


newTicketForm.addEventListener("submit", async event => {
    event.preventDefault();

    clearError();
    clearSuccess();

    const title = ticketTitleInput.value.trim();
    const createdBy = createdByInput.value.trim();
    const status = ticketStatusInput.value;

    if (!title) {
        showError("Ticket title is required.");
        ticketTitleInput.focus();
        return;
    }

    if (!createdBy) {
        showError("Created-by email is required.");
        createdByInput.focus();
        return;
    }

    createTicketButton.disabled = true;
    createTicketButton.textContent = "Creating...";

    try {
        const response = await fetch("/api/tickets", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                title: title,
                created_by: createdBy,
                status: status
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to create the ticket."
            );
        }

        const newTicketId = data.ticket.ticket_id;

        closeNewTicketForm();

        showSuccess(
            `Ticket #${newTicketId} was created successfully.`
        );

        await loadTickets(false);
        await loadTicket(newTicketId);

    } catch (error) {
        showError(error.message);

    } finally {
        createTicketButton.disabled = false;
        createTicketButton.textContent = "Create Ticket";
    }
});

newMessageForm.addEventListener("submit", async event => {
    event.preventDefault();

    clearError();
    clearMessageSuccess();

    if (selectedTicketId === null) {
        showError(
            "Select a ticket before adding a message."
        );
        return;
    }

    const messageText =
        messageTextInput.value.trim();

    const author =
        messageAuthorInput.value.trim();

    if (!messageText) {
        showError("Message text is required.");
        messageTextInput.focus();
        return;
    }

    if (!author) {
        showError("Message author is required.");
        messageAuthorInput.focus();
        return;
    }

    addMessageButton.disabled = true;
    addMessageButton.textContent = "Adding...";

    try {
        const response = await fetch(
            `/api/tickets/${selectedTicketId}/messages`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message_text: messageText,
                    author: author
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to add the message."
            );
        }

        messageTextInput.value = "";

        showMessageSuccess(
            "Message added successfully."
        );

        // Reload the selected ticket so the new message appears.
        await loadTicket(selectedTicketId);

        // Reload the ticket list so its message count increases.
        await loadTickets(false);

    } catch (error) {
        showError(error.message);

    } finally {
        addMessageButton.disabled = false;
        addMessageButton.textContent = "Add Message";
    }
});


updateStatusButton.addEventListener("click", async () => {
    clearError();
    clearStatusSuccess();

    if (selectedTicketId === null) {
        showError(
            "Select a ticket before updating its status."
        );
        return;
    }

    const newStatus = statusSelect.value;

    updateStatusButton.disabled = true;
    updateStatusButton.textContent = "Updating...";

    try {
        const response = await fetch(
            `/api/tickets/${selectedTicketId}/status`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    status: newStatus
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Unable to update the ticket status."
            );
        }

        await loadTicket(selectedTicketId);
        await loadTickets(false);

        showStatusSuccess(
            "Status updated successfully."
        );

    } catch (error) {
        showError(error.message);

    } finally {
        updateStatusButton.disabled = false;
        updateStatusButton.textContent = "Update";
    }
});

loadTickets();