# Compensi SSI

App gestione compensi mensili SI Soluzioni Impresa (SSI) — Poggibonsi, Toscana.

## Funzionalità

- Flusso mensile: incassato → GRFM → aree → personale → utili
- Organigramma interattivo con mini-org per area
- Tabella commerciale con CA e agenti
- Dashboard produzione, formazione, amministrazione, HR
- Storico snapshot mensili sincronizzati su cloud (Supabase)
- Simulatore what-if e proiezioni
- Export PDF

## Deploy

GitHub Pages: [maci81x.github.io/compensi-ssi](https://maci81x.github.io/compensi-ssi)

## Stack

- Vanilla HTML/CSS/JS (single file, no build)
- Supabase (PostgreSQL) per salvataggio snapshot
- Chart.js per grafici
- jsPDF per export

## Tabella Supabase

`compensi_snapshots`: id, created_at, mese, data_json (jsonb), note
