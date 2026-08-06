import os
import psycopg
from databricks.sdk import WorkspaceClient


workspace = WorkspaceClient()


def get_connection() -> psycopg.Connection:
    """
    Create a Lakebase connection using a fresh short-lived OAuth token.

    Databricks Apps supplies the PG* environment variables.
    ENDPOINT_NAME comes from the Lakebase app resource in app.yaml.
    """

    required_variables = [
        "PGHOST",
        "PGPORT",
        "PGDATABASE",
        "PGUSER",
        "PGSSLMODE",
        "ENDPOINT_NAME",
    ]

    missing = [
        variable
        for variable in required_variables
        if not os.environ.get(variable)
    ]

    if missing:
        raise RuntimeError(
            "Missing required environment variables: "
            + ", ".join(missing)
        )

    credential = workspace.postgres.generate_database_credential(
        endpoint=os.environ["ENDPOINT_NAME"]
    )

    return psycopg.connect(
        host=os.environ["PGHOST"],
        port=int(os.environ["PGPORT"]),
        dbname=os.environ["PGDATABASE"],
        user=os.environ["PGUSER"],
        password=credential.token,
        sslmode=os.environ["PGSSLMODE"],
    )

