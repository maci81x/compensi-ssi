# HANDOVER — Compensi SSI

Stato del lavoro al 2026-07-22, per continuare su un altro portatile.

## Come ripartire

```bash
git clone https://github.com/maci81x/compensi-ssi.git
cd compensi-ssi
git checkout ssi-compensi-import-phase
python3 -m http.server 8791
# poi apri http://localhost:8791/
```

Repo: **https://github.com/maci81x/compensi-ssi**
Branch di lavoro: **`ssi-compensi-import-phase`** (non è mergiato su `main`, non toccare Pages — il sito live resta quello attuale su `main`).

Nota: i tre file Excel sorgente (`PF SI 2026.xlsx`, `26_Dettaglio costi dipendenti.xlsx`, `26_Controllo di gestione.xlsx`) servono solo per **aggiornamenti futuri** dei dati — i dati veri di questi file sono già stati trascritti dentro `DEF` nel codice (`index.html`), non serve ricaricarli per continuare a lavorare.

---

## Fasi completate (1-6)

Riferimento completo: `SPEC-v10.md` nel repo.

1. **Import** — pagina dedicata per caricare i 3 Excel, mapping automatico (area/fisso-variabile/dipendenti), anteprima + conferma prima di sovrascrivere `S`.
2. **Tassonomia aree + organigramma + CRUD esteso** — aree allineate alla contabilità reale (Commerciale, Produzione, Amministrazione, Marketing, Formazione, Sorveglianza Sanitaria, Segreteria), organigramma SVG interattivo.
3. **Personale a lordo (natura) + cascata a priorità** — dipendenti/soci/P.IVA con garantito distinto; `flow()` ricalcolato come cascata a priorità (§5): incassato − GRFM − prioritari − garantito = liquidità disponibile − budget aree − premi = utili.
4. **Centri di costo / margine** — 6 centri sotto Produzione (Antincendio, Ambiente, Cantieri, RSPP, Verifiche Terra, Documenti), margine = valore − costo fisso − costo variabile, rollup sulla macro area quando i centri sono "chiusi".
5. **Premi / pannello direttore + soglia sostenibilità** — pool premi per area da margine/KPI (cancello 101%), slider con capienza in tempo reale, distribuzione tra le persone, maturazione mese/trimestre con storico; semaforo Z/Y/X su Dashboard CDA; grafici legacy riallineati alla nuova cascata.
6. **Seed dati reali + fissi/variabili per area + org drag&drop + schema versionato** — vedi dettaglio sotto.

### Cosa fa la Fase 6 nel dettaglio

- **Seed costi centri dal PF**: fornitore fisso + dettaglio fornitori (espandibile, CRUD) per Sorveglianza Sanitaria, Ambiente, Antincendio, Formazione, Commerciale, Verifiche Terra. Analisi assorbito in Ambiente, Estintori in Antincendio (erano la stessa cosa nel PF), Privacy/Acustica rimossi (nessun dato reale).
- **Vista Fissi vs Variabili per area** — in "Struttura & aree", raggruppa `S.sistemaFissi` per area con drill-down.
- **Dati reali 2026** dal Controllo di gestione — fatturato/costi esterni mensili (gen-mag) per precompilare l'incassato, margine reale come benchmark vs margine modello su Dashboard CDA (alert se divergono >5 punti).
- **Ricavo per centro switchabile** tecnico/manuale/% fatturato.
- **Organigramma drag & drop** — trascinare una card su un'altra cambia il `parentId`, con controllo anti-ciclo, flash di conferma e pulsante Annulla.
- **Schema versionato + migrazione automatica** (root cause fix, non un cerotto): `CURRENT_SCHEMA_VERSION` + `SCHEMA_MIGRATIONS` — uno stato che arriva (locale, cloud, realtime) da una versione precedente viene migrato aggiungendo solo ciò che manca, mai sovrascrivendo dati presenti; se lo stato in arrivo da cloud/realtime è più vecchio di quello corrente, si chiede conferma esplicita prima di applicarlo.

---

## Numeri chiave validati

Verificati leggendo `index.html` in un browser pulito (Playwright, rete Supabase bloccata per non scrivere sullo stato condiviso durante i test) e confrontati uno per uno con le cifre attese:

| Voce | Valore |
|---|---|
| Garantito personale (dipendenti + soci, esclusa CDA) | **€ 40.916,15/mese** |
| Sistema (costi fissi overhead) | **€ 43.994,28** |
| Prioritari (voci prioritarie — leasing/F24/IVA/rateizzi/TFR) | **€ 6.088,56** |
| Dipendenti agganciati (match import ↔ personale) | **13/13** |
| Incassi settimanali reali 2026 | **6 settimane, somma € 312.816,91** (identica al totale di riga 7 del foglio sorgente — quella riga è il totale, non una settimana, correttamente esclusa) |

## Cloud (Supabase — progetto `qujxbvootvollmziaqrd`)

- `compensi_stato` (stato condiviso multi-dispositivo, tabella `id='current'`): **migrato a `schemaVersion: 6`**, ora ha 13 aree (7 macro/sotto-aree + 6 centri di costo). `incassato=200000` e `periodicita='settimanale'` — dati reali preesistenti — **preservati intatti** dalla migrazione, non toccati.
- Controllo di versione anti-sovrascrittura attivo: se un dispositivo con codice più vecchio si ricollega, il suo stato viene migrato e **si chiede conferma prima di applicarlo** — non può più sovrascrivere in silenzio lavoro più recente di un altro dispositivo/scheda dimenticata aperta.
- `compensi_snapshots` (storico snapshot mensili): 2 righe reali "giugno 2026" (vedi punti aperti sotto per il valore anomalo).

---

## Punti aperti

1. **Policy RLS su `compensi_snapshots`**: la `DELETE` con la chiave anon usata dall'app viene bloccata in silenzio dalle RLS (PostgREST risponde 200 con 0 righe cancellate, non un errore) — il bottone "🗑 elimina snapshot" nell'app quindi non cancella nulla in cloud. L'app ora rileva l'esito e mostra un errore esplicito invece di far credere che sia andata a buon fine, ma il problema di fondo (permessi) resta lato database: serve una policy che permetta DELETE al ruolo usato dall'app, o autenticare l'app con un ruolo che ce l'ha (oggi non c'è un vero login Supabase, solo `currentUser` locale).

2. **Snapshot giugno 2026 con valore anomalo**: incassato registrato **€ 2.024.840**, ma il fatturato mensile reale (dal Controllo di gestione) è nell'ordine di €150-200k — quindi è circa **10× troppo alto** e falsa qualunque grafico storico che lo includa. Da verificare con chi l'ha inserito (probabile errore di battitura, es. una cifra di troppo) e correggere sia in `compensi_snapshots` sia nel blob `S.snaps` dentro `compensi_stato`. Non l'ho corretto io: è un dato storico reale, la decisione se e come editarlo spetta a chi lo ha inserito.

3. **Ricavo per centro da alimentare**: l'infrastruttura (modo tecnico/manuale/%, editabile in "Centri di costo" e in "Produzione tecnici") è pronta, ma i valori per i centri senza produzione tecnica collegata (Cantieri, RSPP, Documenti, Verifiche Terra) sono ancora a zero — vanno inseriti a mano o via % del fatturato quando si hanno i dati.

4. **Passata grafica** — non ancora fatta, l'app ha ricevuto solo lavoro funzionale finora.

5. **Merge finale su `main` e push su Pages** — deliberatamente non fatto finché il lavoro non è validato: il branch `ssi-compensi-import-phase` resta separato da `main`, il sito live su GitHub Pages non è stato toccato.
