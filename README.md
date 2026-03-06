# Shopplist - Progressive Web App

Eine minimalistische, moderne und reaktionsschnelle Einkaufslisten-App als Progressive Web App (PWA). Entworfen für die gemeinsame Nutzung via Supabase Echtzeit-Datenbank.

## Features
- **Einkaufsliste mit Kategorien**: Füge Einträge hinzu, weise sie Kategorien zu (Obst & Gemüse, Kühlregal, etc.) und filtere die Liste.
- **Intelligente Mengenerkennung**: Gleiche Artikel (z.B. "Milch 1L" und "Milch 2L") werden erkannt und bei gleichem Namen aufaddiert.
- **Custom Theming**: Wähle aus verschiedenen edlen Akzentfarben (Pastelltöne) und einem separaten Dark Mode. Die Einstellungen werden lokal gespeichert.
- **Drag & Drop Sortierung**: Halte Einträge gedrückt, um sie in deiner Wunschreihenfolge anzuordnen.
- **Favoriten & Rezepte**: Lege häufige Artikel als Favoriten ab oder speichere ganze Rezepte mit Zutatenmengen, die sich automatisch an die Personenzahl anpassen lassen.
- **Offline-Fähigkeit & Installierbarkeit**: Dank Service Worker ist die App als PWA auf dem Homescreen installierbar und lädt Grundfunktionen offline (Datenbank-Sync erfordert Internetverbindung).

## Technologien
- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (CSS Variables, Flexbox, Grid).
- **Backend & Datenbank**: [Supabase](https://supabase.com/) (PostgreSQL) für Echtzeitsynchronisation
- **Architektur**: Single Page Application (SPA) / Progressive Web App (PWA)

## Setup
Um die App selbst zu hosten oder weiterzuentwickeln:

1. Klone das Repository.
2. Richte ein Supabase-Projekt ein.
3. Erstelle folgende Tabellen in deiner Supabase-Datenbank:
   - `shopping_list` (Spalten: `name` (text, primary key), `amount` (text), `is_checked` (boolean), `category` (text), `order_index` (int4))
   - `favorites` (Spalten: `name` (text, primary key), `amount` (text))
   - `recipes` (Spalten: `name` (text, primary key), `base_portions` (int4), `ingredients` (jsonb))
4. Trage deine Supabase Project URL und den Anon Key in der Datei `js/db.js` ein.
5. Hoste das Projekt (z.B. über GitHub Pages).

## Lizenz
Mit ❤️ entwickelt.
