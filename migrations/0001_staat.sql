-- De staat van Lesdag, per onderdeel een rij (zie delen() in public/sync.js). Een rij mag in D1 hooguit 2 MB zijn.
CREATE TABLE onderdeel (sleutel TEXT PRIMARY KEY, waarde TEXT NOT NULL);
-- versie telt elke schrijfronde; schrijver maakt een ronde ondeelbaar als twee apparaten tegelijk schrijven.
CREATE TABLE meta (id INTEGER PRIMARY KEY CHECK (id = 1), versie INTEGER NOT NULL, bijgewerkt INTEGER NOT NULL, schrijver TEXT);
INSERT INTO meta (id, versie, bijgewerkt) VALUES (1, 0, 0);
-- dag = JJJJ-MM-DD (stand aan het begin van die dag, 30 dagen bewaard) of eerste (stand na de eerste upload, blijft staan).
CREATE TABLE back_up (dag TEXT NOT NULL, sleutel TEXT NOT NULL, waarde TEXT NOT NULL, PRIMARY KEY (dag, sleutel));
