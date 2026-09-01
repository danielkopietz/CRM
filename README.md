# CRM Verzollung

Webbasiertes Deal- und Fristen-Cockpit fuer Import-, Fracht- und Verzollungsprozesse.

## MVP

- Auth0 Login mit E-Mail und Passwort
- PostgreSQL Datenbank ueber Prisma
- Deals fuer Lidl, Kaufland, Hartmann usw. anlegen und bearbeiten
- Feste Kundenauswahl fuer Sensiplast, Sanitas, Kaufland, Hartmann und Private Label; Hartmann-Deals nutzen eine reduzierte Erfassung fuer Artikel, Liefertermin, eine PO, naechsten Schritt und aktuellen Status
- Felder fuer Marke, Artikel, Menge, Preis, LIDL Dealnummer, Ausmusterung, CRD, Liefertermin und Notizen
- Eigene PO-Nummer, ETD und ETA fuer Mass Production, Drittlandsware, Fotomuster, QS Muster und Serviceware
- Status: Neu, In Klaerung, PO offen, Muster offen, Produktion, Verschifft, Verzollung vorbereiten, Beim Zoll, Freigegeben, Abgeschlossen, Problem / Rot
- Ampel: Gruen, Gelb, Rot
- Verlauf/Notizen pro Deal
- Reiter fuer Uebersicht, Kalender und Deals
- Einkauf-KPIs: Heute faellig, ETA/ETD diese Woche und Dokumentenluecken
- Einfache Erledigt-Checkboxen fuer Drafts, Verschiffungspapiere, Telex B/L, Proforma Drittlandsware, 100% Inspektion, Shipment Release, Release Document, H1, T1 und Entladebericht
- Automatische Aenderungshistorie fuer Menge, Preis, ETD und ETA
- Dynamische Erinnerungen drei Tage vor allen ETDs, 14 Tage vor Mass-Production-/Drittlandsware-ETA fuer die Verzollung und drei Tage vor ETA fuer H1/T1, jeweils mit Zum Deal, 15 Minuten spaeter und Erledigt
- Beliebig viele individuelle Erinnerungen pro Deal mit Kalendereintrag und faelligem Pop-up unten links (Zum Deal, 15 Minuten spaeter, Erledigt)
- Fertige Uebersichten fuer Sensiplast, Sanitas, Kaufland und Hartmann
- Dockerfile fuer Coolify

## Ampelregeln

- Gruen: Deal ist nicht kritisch
- Gelb: `Bearbeiten bis` ist heute oder morgen
- Rot: ETA ist heute/ueberschritten, `Bearbeiten bis` ist ueberfaellig oder Status ist `Problem / Rot`

## Einkaufssicht

Die Uebersicht ist als Arbeitsliste fuer internationale Einkaeufer aufgebaut:

- Kritische Deals werden zuerst angezeigt
- Kalender zeigt ETD, ETA, interne Bearbeitungsfristen und individuelle Deal-Erinnerungen
- Unvollstaendige Deals koennen gespeichert und spaeter ergaenzt werden; fehlende ETA bleibt sichtbar
- Kompakte Keyfacts-Spalte fuer Marke, Kunde, Dealnummer, Ausmusterung, Artikel, Liefertermin und CRD Window
- Mehrzeilige Artikelangaben sowie eine breite Erfassungsansicht ohne horizontal abgeschnittene Inhalte
- Dauerhaft speicherbare Erledigt-Checkboxen fuer jede PO-Zeile in der Uebersicht
- Stabile Deal-Sortierung nach Ausmusterung; PO-Haekchen veraendern die Reihenfolge nicht
- Dezente Reminder-Box unten links fuer Deals, die Aufmerksamkeit brauchen

## Lokale Entwicklung

```bash
cp .env.example .env.local
npm install
npm run db:push
npm run dev
```

## Coolify Setup

1. GitHub Repository verbinden: `https://github.com/danielkopietz/CRM`
2. Neue PostgreSQL-Datenbank in Coolify anlegen
3. App als Dockerfile Deployment anlegen
4. Domain setzen: `crm.automatisierungen-ki.de`
5. Environment Variables setzen:

```bash
DATABASE_URL=postgresql://...
AUTH0_DOMAIN=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_SECRET=...
APP_BASE_URL=https://crm.automatisierungen-ki.de
```

`AUTH0_SECRET` erzeugen:

```bash
openssl rand -hex 32
```

## Auth0 URLs

In der Auth0 Application eintragen:

```text
Allowed Callback URLs:
https://crm.automatisierungen-ki.de/auth/callback
http://localhost:3000/auth/callback

Allowed Logout URLs:
https://crm.automatisierungen-ki.de
http://localhost:3000
```
