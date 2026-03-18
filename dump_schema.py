import sys
from sqlalchemy.schema import CreateTable
from app.core.database import engine, Base

import app.models.user
import app.models.cv
import app.models.job_description
import app.models.skill
import app.models.analysis

with open('schema.sql', 'w', encoding='utf-8') as f:
    for name, table in Base.metadata.tables.items():
        f.write(str(CreateTable(table).compile(engine)) + ';\n\n')
print("Schema generated successfully.")
