-- Regie op de tablet (16-11-2026): het bord (laptop) zet hier waar de les is, de tablet stuurt opdrachten.
-- Alleen les-id, dia, klokstand en opdrachten zoals "volgende"; geen leerlinggegevens (functions/api/regie.js laat niets anders door).
-- functions/api/regie.js maakt deze tabellen ook zelf aan als ze nog ontbreken (IF NOT EXISTS), dus de migratie is geen voorwaarde.
CREATE TABLE IF NOT EXISTS regie (id INTEGER PRIMARY KEY CHECK (id = 1), staat TEXT, ms INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS regie_opdracht (nr INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, opdracht TEXT NOT NULL, ms INTEGER NOT NULL);
