@echo off
set PGPASSWORD=Samolan123
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -p 5432 -c "CREATE DATABASE \"CosmosERP\";"
echo Done.
