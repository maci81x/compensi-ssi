# HANDOVER — Compensi SSI

Stato del lavoro al 2026-07-23 — chiusura Fase 8 (gap costi + guida + minori).

## Come ripartire

```bash
git clone https://github.com/maci81x/compensi-ssi.git
cd compensi-ssi
python3 -m http.server 8791
# poi apri http://localhost:8791/
```

Repo: **https://github.com/maci81x/compensi-ssi**
Branch attivo: **`main`** — GitHub Pages pubblica su
`https://maci81x.github.io/compensi-ssi/`.

Nota: i tre file Excel sorgente (`PF SI 2026.xlsx`,
`26_Dettaglio costi dipendenti.xlsx`, `26_Controllo di gestione.xlsx`) servono
solo per **aggiornamenti futuri** dei dati — i dati veri di questi file sono
già dentro `DEF` in `index.html`, non serve ricaricarli per continuare a
lavorare.

---

## Fasi completate (1-7)

Riferimento completo: `SPEC-v10.md`.

1. **Import** — pagina dedicata per i 3 Excel, mapping automatico + anteprima.
2. **Tassonomia aree + organigramma + CRUD esteso**.
3. **Personale a lordo + cascata a priorità** — dipendenti/soci/P.IVA con
   garantito distinto; `flow()` come cascata (§5).
4. **Centri di costo / margine** — 6 centri sotto Produzione con margine
   fisso/variabile e rollup sulla macro area.
5. **Premi / pannello direttore + soglia sostenibilità** — pool premi per area,
   slider, distribuzione, maturazione mese/trimestre, semaforo Z/Y/X.
6. **Seed dati reali + fissi/variabili per area + org drag&drop + schema
   versionato v6**.
7. **Ricavo per centro come % di default + passata grafica + QA finale +
   merge in produzione** (Fase 7, 2026-07-23).
8. **Chiusura gap costi + guida operativa + correzioni minori** (Fase 8,
   2026-07-23).

### Cosa fa la Fase 7 nel dettaglio

- **Ripartizione % del fatturato come default per 8 unità produttive** (i 6
  centri + Formazione + Sorveglianza Sanitaria). Somma vincolata a 100%,
  editabile dall'UI. Ripartizione iniziale ragionata su fissi reali + volumi
  attesi: Sorveglianza Sanitaria 20% · Antincendio 18% · Documenti 15% ·
  Formazione 15% · RSPP 12% · Ambiente 10% · Cantieri 8% · Verifiche Terra 2%.
- **Override "REALE" automatico**: un `ricavoManuale > 0` vince sempre sulla
  stima %, senza dover cambiare modo — quando arrivano i ricavi per servizio
  veri basta digitarli. Badge STIMA / REALE / TECNICO in tabella.
- **Bottone "Normalizza a 100%"** per riportare la ripartizione alla somma
  attesa quando alcune unità sono passate a `manuale` o `tecnico`.
- **Margine aziendale (modello) confrontato col REALE YTD 23,41%** — con
  semaforo verde/giallo/rosso (±5 / ±10 pt) sul Dashboard Centri di costo.
- **Passata grafica**: KPI del semaforo dashboard più grandi (hero + primary
  cards), coerenza colori/tipografia, print CSS A4 con page-breaks/hide UI/
  colori azzerati per stampa CDA pulita, respiro maggiore in organigramma
  (`HGAP 20→32`, `VGAP 50→64`, `CW 148→160`, `CH 80→86`), tabelle unificate
  `.tbl-clean` con hover + footer sticky sui totali, alert coerenti
  info/warn/err/ok, banner `kpi-strip` per numeri chiave in evidenza.
- **Schema v7** con migrazione automatica: preserva ogni `ricavoManuale > 0` o
  `ricavoPct` esplicito già impostato dall'utente, applica il default solo
  dove non c'è nulla (root cause fix, non un cerotto).
- **Pulizia dati storici**: cancellati i 2 snapshot anomali "giugno 2026" con
  `incassato = 2.024.840` (dati di test residui dal 10 giugno, il valore era
  il budget venduto annuo scambiato per mensile) sia in `compensi_snapshots`
  sia dentro `S.snaps`. Cancellata anche la riga `TEST 2099-01`. La tabella
  `compensi_snapshots` è vuota: **il primo snapshot vero sarà luglio 2026.**

### Cosa fa la Fase 8 nel dettaglio

- **Fix doppio conteggio nel margine aziendale**: `totSistemaFissi` include
  57 voci con `areaId` puntante a un centro (form/sorvsan/c_ambiente/
  c_antincendio/c_verifiche_terra) che sono le STESSE voci dei `.fornitori`
  di quei centri. Prima venivano contate due volte (16.627/mese doppio).
  Ora il modello sottrae automaticamente le dupliche.
- **Personale interno incluso nel margine**: il foglio Controllo di gestione
  contabilizza il margine come "dopo-personale" (fatturato − costi esterni
  che includono stipendi + fornitori). Il modello ora somma garantito
  personale (dipendenti + soci = 40.916) + CDA (13.600) nei costi.
- **Voce "altri costi operativi"** (`S.altriCostiOperativi`, default 15.000,
  editabile dall'UI in Centri di costo): copre ammortamenti + materiali +
  subappalti occasionali + provvigioni variabili agenti non modellate (nel
  PF sono aggregate come "Manutenzioni varie/Varie/Regali"). Badge STIMA.
- **Effetto**: con incassato 174k (media reale 2026) il margine modello è
  **25,34%** vs reale YTD 23,41% → **Δ 1,93 pt**, dentro ±5 pt come richiesto.
- **Schema v8** con migrazione che aggiunge `altriCostiOperativi` solo se
  assente (preserva override utente).
- **Nuovo pannello espandibile in Centri di costo** con dettaglio composizione
  costi aziendali (fornitori centri · sistema dedotto · prioritari · tasse ·
  personale · CDA · altri) e nota sul confronto vs reale.
- **Guida operativa riscritta** (📖 nel menu): allineata alla v10 con 13
  passi (era 8 pre-Fase 2), rimossa HR come area, aggiornato Marco come
  Dir. Marketing autonomo, aggiunti Centri di costo/Premi/Semaforo/Import/
  Drag&drop/Prioritari/Simulatore/Personale. Corretto "i dati non si
  salvano automaticamente" (era falso dalla Fase 3, autosave + sync cloud
  attivi). Chi inserisce cosa aggiornato.
- **Correzioni minori**: etichetta login "v9" → "v10 · Fasi 1-8"; passo 3
  wizard riscritto — mostra solo GRFM/CDA/Soglia (le uniche voci ancora
  usate dalla cascata a priorità), rimosse le 3 voci %-based legacy (costi
  fissi/variabili/accantonamenti) che dalla Fase 3 non impattavano più
  utili/liquidità/semaforo. Sostituite dalle voci puntuali in Sistema/
  Prioritari/Tasse.

---

## Numeri chiave validati (QA finale headless — Playwright)

Verificati leggendo `index.html` in un browser pulito (Playwright, rete
Supabase bloccata per non contaminare lo stato condiviso durante i test):

| Voce | Valore |
|---|---|
| Garantito personale (dipendenti + soci) | **€ 40.916,15/mese** ✓ |
| Sistema (costi fissi overhead) | **€ 43.994,28** ✓ |
| Prioritari (leasing/F24/IVA/rateizzi/TFR) | **€ 6.088,56** ✓ |
| Dipendenti agganciati (match import ↔ personale) | **13/13** ✓ |
| Incassi settimanali reali 2026 | 6 settimane, somma € 312.816,91 |
| Schema version | 8 ✓ |
| Margine modello a inc 174k (media reale 2026) | 25,34% (Δ 1,93 pt vs reale 23,41%) ✓ |
| Dedup sistema (voci con areaId centri) | 16.627/mese sottratti ✓ |
| Personale interno incluso nel margine aziendale | 40.916,15 ✓ |
| altri costi operativi (STIMA, default v8) | € 15.000/mese |
| Cascata somma 100% dell'incassato | ✓ |
| Semaforo X/Y/Z coerente Dashboard ↔ Simulatore | ✓ (stessa `flow()`) |
| Pagine navigate senza errore console | 17 / 17 ✓ |
| Console errors | 0 · Warnings 0 |

## Cloud (Supabase — progetto `qujxbvootvollmziaqrd`)

- `compensi_stato` (stato condiviso multi-dispositivo, `id='current'`):
  **verrà migrato a `schemaVersion: 8`** al primo caricamento del client
  aggiornato (aggiunge `altriCostiOperativi=15000` se assente, non tocca
  override utenti).
  Dati reali preesistenti (`incassato=200000`, `periodicita='settimanale'`)
  restano intatti: la migrazione v7 aggiunge/ribalta solo `ricavoModo` e
  `ricavoPct` sulle 8 unità produttive quando non c'è un override esplicito
  dell'utente.
- Controllo di versione anti-sovrascrittura attivo (già Fase 6): una scheda
  vecchia che risincronizza chiede conferma prima di applicare.
- `compensi_snapshots`: **vuoto**. Il primo snapshot vero (luglio 2026) verrà
  creato dal pulsante "Salva mese corrente" nella pagina Storico.

---

## Punti aperti

1. **Policy RLS su `compensi_snapshots` — non risolto lato DB**: la `DELETE`
   con la chiave anon usata dall'app viene bloccata in silenzio dalle RLS
   (PostgREST risponde 200 con 0 righe cancellate, non un errore). L'app
   rileva l'esito (`count` sulla delete) e mostra errore esplicito invece di
   far credere che sia andata bene, ma il problema di fondo (permessi) resta
   lato database. Servono UNA delle due:
   - policy `DELETE` per il ruolo anon (soluzione più veloce), oppure
   - autenticare l'app con un utente Supabase reale con permessi (richiede
     schermata di login vera al posto di `currentUser` locale).

2. **Ricavi per servizio reali da inserire** (evoluzione del punto 3 aperto
   originale): la ripartizione % del fatturato è ora la STIMA di default —
   somma 100%, ragionata su fissi + volumi attesi. Quando arriveranno i ricavi
   per servizio veri (dalla contabilità o dal gestionale), basta scrivere il
   valore € nel campo "Manuale" della pagina Centri di costo, unità per
   unità: l'app userà automaticamente quel valore (badge REALE) al posto
   della stima. Nessun ricalcolo o switch di modo necessario.

3. **Voce "altri costi operativi" come stima aggregata** (default 15.000/mese):
   copre ammortamenti, materiali, subappalti occasionali, provvigioni variabili
   agenti — voci del foglio Controllo di gestione non ancora catalogate
   puntualmente nel modello. Da spacchettare in voci concrete quando arriveranno
   i dati (fattura per fattura) e portare a 0 il "residuo" — Fase 9 futura.
   Oggi è editabile con badge STIMA sulla pagina Centri di costo.
