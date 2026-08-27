# CRM Verzollung

Webbasiertes Deal- und Fristen-Cockpit fuer Import-, Fracht- und Verzollungsprozesse.

## MVP

- Auth0 Login mit E-Mail und Passwort
- PostgreSQL Datenbank ueber Prisma
- Deals fuer Lidl, Kaufland, Hartmann usw. anlegen und bearbeiten
- Felder fuer Marke, Artikel, Menge, Preis, Dealnummer, PO, ETD, ETA, CRD, Liefertermin und Notizen
- Status: Neu, In Klaerung, PO offen, Muster offen, Produktion, Verschifft, Verzollung vorbereiten, Beim Zoll, Freigegeben, Abgeschlossen, Problem / Rot
- Ampel: Gruen, Gelb, Rot
- Verlauf/Notizen pro Deal
- Reiter fuer Uebersicht, Kalender und Deals
- Einkauf-KPIs: Heute faellig, ETA/ETD diese Woche, Blocker und Dokumentenluecken
- Lieferant, Spedition, Incoterm, POL/POD, Container, BL/AWB und Zahlungsstatus
- Dokumentenstatus fuer Commercial Invoice, Packing List, BL/AWB, Ursprung, HS Code, CE und Pruefberichte
- Automatische Aenderungshistorie fuer Menge, Preis, ETD und ETA
- Dockerfile fuer Coolify

## Ampelregeln

- Gruen: Deal ist nicht kritisch
- Gelb: `Bearbeiten bis` ist heute oder morgen
- Rot: ETA ist heute/ueberschritten, `Bearbeiten bis` ist ueberfaellig oder Status ist `Problem / Rot`

## Einkaufssicht

Die Uebersicht ist als Arbeitsliste fuer internationale Einkaeufer aufgebaut:

- Kritische Deals werden zuerst angezeigt
- Blocker zeigen, ob intern, Lieferant, Spedition, Kunde oder Zoll am Zug ist
- Kalender zeigt ETD, ETA und interne Bearbeitungsfristen
- Risikoampel beruecksichtigt manuelles Risiko und fehlende Dokumente
- Pflichtfelder schuetzen vor unvollstaendigen Deals: Kunde, Artikel, Menge, PO, ETD, ETA oder bewusst unbekannt, Bearbeiten bis, naechster Schritt
- Quick Actions direkt an der Deal-Zeile fuer ETA, naechsten Schritt, Wartet-auf und Abschluss
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
