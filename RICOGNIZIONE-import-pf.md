# RICOGNIZIONE — Stato modello dati per import PF

**Branch**: `import-pf` (partito da `main` @ `fbc1639`)
**Scopo**: mappa in sola lettura di `DEF` → `S` per preparare l'import dei dati reali del PF SI 2026. Nessuna modifica al codice.
**Data**: 2026-07-27

## Baseline verificata

Regression `13/13 verde` (invariants + smoke L1..L6 + G + H + F + E1 + I + batch2 + segreteria). I 4 invarianti a valori attesi:

| Invariante | Atteso | Rilevato |
|---|---:|---:|
| Sistema (`totSistema`) | 43.994,28 | **43.994,28** ✅ |
| Garantito personale (`Σ garantitoNatura`) | 40.916,15 | **40.916,15** ✅ |
| Liquidità (`inc − grfm − prioritariP1 − garantito`) | 3.537 | **3.537** ✅ |
| Fornitori totali (`Σ area.fornitoreFisso`) | 20.356,43 | **20.356,43** ✅ |

**Schema attuale**: v13 · 30 aree · 26 persone · incassato demo = 136.363 €/mese.

---

## A) MAPPA MACRO-AREE

### A.0 · Nodi al di fuori di SSI SRL (holding e governance)

Sono renderizzati nell'organigramma ma non sono "aree del modello dati" nel senso stretto: sono scalari o costanti separate.

| Nodo | Percorso in `S` | Valore attuale | Note |
|---|---|---:|---|
| **GRFM** (holding esterna) | `S.voci[0].pct` | **2,0 %** = € 2.727,26/mese | % applicata all'incassato prima di tutto. `grfm = (S.voci[0].pct/100) × S.incassato`. |
| **SSI SRL** (root) | `S.incassato` | **136.363,00** €/mese | Incassato demo (media reale 2026 gen-lug). Serie mensile in `S.incassatoMensile2026 = [122537, 122615, 101594, 123420, 161195, 160782, 162395]`. |
| **CDA** (compenso governance) | `S.cda` | **13.600,00** €/mese | Voce fissa top-level. Non è un'area, non ha figli. `garantito = garantitoPersonale + cda`. |
| **Utili** | derivato `flow().utili` | **3.537 €/mese** | `liquidita − poolP1 − poolP2Eff − poolP3Eff`. |
| **Segreteria** | vedi §A.4 sotto | — | Area macro SSI, ma dal blocco §Segreteria (2026-07-27) è top-level accanto alle altre 3. |

### A.1 · Commerciale (id: `comm`) — Roberto Macinai

| Campo | Percorso | Valore |
|---|---|---:|
| Nome / tipo / natura | `S.aree[id=comm]` | Commerciale · RIC · produttiva |
| `parentId` | `.parentId` | `null` (top-level sotto SSI) |
| Incidenza | `.incPct` | **17,25 %** |
| Budget | `.budget` | `{fisso:0, variabilePct:17,25}` → **23.522,62 €/mese** (`areaBudget()` derivato) |
| Responsabili §F | `.responsabiliIds` | `['p01','p05']` (Roberto + Raia); Raia è in `.capiAreaIds=['p05']` → Roberto è l'unico che scatta §F |
| Fornitori (elenco) | `.fornitori` | 6 voci: Alessandro Raia 1372,50 · Mario Rufolo 831,03 · Alberto Mancini 582,91 · Massimo Giusti 467 · Davide Gaziano 466,66 · Manuel Spina 9,75 |
| Fornitore fisso | `.fornitoreFisso` | 3.729,85 (= somma dettaglio, autoritativa se lista presente) |
| Micro-KPI (seed) | `.micro[]` | 9 KPI (Preventivi acc/fatti %, Incassi in linea %, Nr visite, Nr appuntamenti, Retention %, % persi, Venduto nuovo €, Tipologia INT/EXT, Assistenze) |
| `ricavoModo`/`ricavoPct` | | `manuale` / 0 (non nelle 8 unità con default v7) |

**Sotto-aree** (`.parentId = 'comm'`):
- **`mkt` — Marketing** (Marco Macinai)
  - incPct **5,77 %**, budget.variabilePct 5,77 → **7.868,14 €/mese**
  - `responsabiliIds:['p02']` (Marco), §F attivo
  - `ricavoPct=0`, `ricavoModo=manuale` (non nelle 8 unità v7)
  - Fornitori: nessuno seed. `desc="Marketing, comunicazione, campagne, fornitori esterni"`
- **`c_senior_sales` — Senior Sales** (nodo tecnico, `chiusa=true`, incPct 0, nessun responsabile)
- **`c_junior_sales` — Junior Sales** (idem)
- **`c_bandi_gare` — Bandi e Gare** (idem)

### A.2 · Produzione (id: `prod`) — Giovanna Panti

| Campo | Percorso | Valore |
|---|---|---:|
| Nome / tipo / natura | `S.aree[id=prod]` | Produzione · RIC · produttiva |
| Incidenza | `.incPct` | **11,31 %** |
| Budget | `.budget` | `{fisso:0, variabilePct:11,31}` → **15.422,66 €/mese** |
| Responsabili §F | `.responsabiliIds` | `['p03']` (Giovanna) — §F attivo |
| Fornitori | `.fornitori` | (nessun seed diretto — sono nei centri figli) |
| Fornitore fisso | `.fornitoreFisso` | 0 |
| Micro-KPI seed | `.micro[]` | 10 KPI (Produzione mese €, Rispetto ore/incarichi %, Problematiche, Δ produzione %, Feedback +, RSPP/Formazione €, 1° e 2° margine) |

**Sotto-aree di Produzione** (albero):

- **`rto` — RTO** (Samuele) `parentId=prod`, `chiusa=false`, budget 0
  - `.responsabiliIds:['p07']` (Samuele) — **§F NON scatta** perché rto ha `budget.variabilePct=0` → `isRespF` esclude aree senza budget
  - **`asf` — ASF** `parentId=rto`, `chiusa=false`, budget 0
    - **`c_antincendio` — Antincendio** — `ricavoPct=18` — fornitori Barbagli/ESMA/Tavanti/GTA (`fornitoreFisso=3.466,00`)
    - **`c_ambiente` — Ambiente** — `ricavoPct=10` — fornitori Gracci Studi/Ecogam (`fornitoreFisso=3.969,66`)
    - **`c_cantieri` — Cantieri** — `ricavoPct=8` — fornitoreFisso 0 (POS/PSC interno)
    - **`c_rspp` — RSPP** — `ricavoPct=12` — fornitoreFisso 0
    - **`c_verifiche_terra` — Verifiche Terra** — `ricavoPct=2` — fornitoreFisso 285,00
    - **`c_documenti` — Documenti** — `ricavoPct=15` — fornitoreFisso 0
    - **`c_sicurezza` — Sicurezza** (con 5 sotto-figlie: Analisi acque/tamponi/alimenti, Edilizia, Tarature, SSL CEM-ROA, Campionamento polveri) — tutte budget 0
    - **`c_privacy` — Privacy** — budget 0
    - **`c_certificazioni` — Certificazioni/Accreditamenti** — budget 0
- **`form` — Formazione** (Niccolò) `parentId=prod`
  - incPct **8,5 %**, budget.variabilePct 8,5 → **11.590,86 €/mese**
  - `responsabiliIds:['p11']` (Niccolò) — **§F attivo**
  - `ricavoPct=15` (nelle 8 unità v7)
  - `fornitoreFisso=1.703,52`, `fornitori`: 14 docenti esterni (Marchiaturificio delle Crete, Luca Pagni, Alberto Baessato, …)
  - Micro-KPI: 10 (Ore erogate vs pianificate %, % corsi completati, Nr persone in aula, Tasso riempimento aule %, Fatturato formazione €, % attestati 5gg, Nr corsi INT/EXT, Nr docenti, Registro presenze errori)
  - **Sotto-aree**: `c_segreteria_formativa` (natura=staff), `c_docenti` (fornitori ereditati dalla `form` in normalizzazione)
- **`sorvsan` — Sorveglianza Sanitaria** `parentId=prod`
  - incPct **0** (non contribuisce alla cascata come budget), `ricavoPct=20`
  - `responsabiliIds:[]` (nessun responsabile designato, `resp:''`)
  - `fornitoreFisso=7.201,77`, `fornitori`: 10 (Stemar Srl, Job & Safety Srl, Centro Analisi Cliniche Alba Srl, Biscioni Emanuela, Studi Medici Toscana, …)
  - Micro-KPI: 2 (Visite effettuate nr, Nuovi MC attivati)
  - **Sotto-aree**: `c_medici_competenti` (fornitori ereditati)

### A.3 · Amministrazione (id: `amm`) — Francesco Martini

| Campo | Percorso | Valore |
|---|---|---:|
| Nome / tipo / natura | `S.aree[id=amm]` | Amministrazione · SUP · costo |
| Incidenza | `.incPct` | **10,46 %** |
| Budget | `.budget` | `{fisso:0, variabilePct:10,46}` → **14.263,57 €/mese** |
| Responsabili §F | `.responsabiliIds` | `['p04']` (Francesco) — §F attivo |
| Fornitori | `.fornitori` | (nessun seed diretto) |
| Micro-KPI seed | `.micro[]` | 9 (Cash flow, PF aggiornato, Chiusura contabile, Fatture pagate %, % errori, F24, Proforma, DSO, Riduzione costi €) |

**Sotto-aree**:
- **`c_ufficio_acquisti` — Ufficio Acquisti** `parentId=amm`, natura=costo, budget 0

### A.4 · Segreteria (id: `sis`) — Gaia

| Campo | Percorso | Valore |
|---|---|---:|
| Nome / tipo / natura | `S.aree[id=sis]` | Segreteria · SUP · staff |
| Incidenza | `.incPct` | **3,92 %** |
| Budget | `.budget` | `{fisso:0, variabilePct:3,92}` → **5.345,43 €/mese** |
| Responsabili §F | `.responsabiliIds` | `['p12']` (Gaia) |
| **`esclusaDaCompensiF`** | `.esclusaDaCompensiF` | **`true`** → Gaia NON scatta §F anche se sis avrà KPI |
| Nota descrittiva | `.nota` | *"di cui parte segreteria di direzione"* |
| Micro-KPI seed | `.micro[]` | 8 (Scadenze %, Tempi risposta 3 squilli %, Richieste soci 24h %, Nr errori, Chiamate/email, Interruzioni ai soci, Soddisfazione utenti 1-5, Appuntamenti consultatorie) |

---

## B) ELENCO VOCI ECONOMICHE

**Legenda**: `INPUT` = valore digitato dall'utente/seed. `DERIVATO` = calcolato al volo dal motore (formula riportata).

### B.1 · Cascata a priorità — voci top

| Voce | Percorso | Valore | Tipo | Formula |
|---|---|---:|:-:|---|
| Incassato mese | `S.incassato` | 136.363 | INPUT | seed = media incassato reale 2026 |
| Serie mensile 2026 | `S.incassatoMensile2026` | 7 valori | INPUT | gen-lug reali |
| GRFM % | `S.voci[0].pct` | 2,00 | INPUT | |
| GRFM € | — | 2.727,26 | DERIVATO | `(S.voci[0].pct/100) × S.incassato` |
| CDA | `S.cda` | 13.600 | INPUT | compenso fisso governance |
| Altri costi operativi | `S.altriCostiOperativi` | 15.000 | INPUT | seed reale (ammortamenti, subappalti, ecc.) |
| Priorità Sistema/Tasse/Altri | `S.prioritaSistema/Tasse/AltriCosti` | 1/1/1 | INPUT | |
| Sistema (overhead) | — | 43.994,28 | DERIVATO | `totSistema() = Σ S.sistemaFissi.filter(!escludi).val` |
| Tasse | — | 10.500,00 (circa) | DERIVATO | `totTasse() = Σ S.tasse[].voci[].val` |
| Prioritari P1 | — | 75.582,84 | DERIVATO | `Σ S.prioritari[].val (prio=1) + Sistema + Tasse + Altri` |
| Garantito personale | — | 40.916,15 | DERIVATO | `Σ garantitoNatura(p)` — dipendenti `costoAziendaMensile`, soci `fissoMensile`, piva=0 |
| Garantito (con CDA) | `flow().garantito` | 54.516,15 | DERIVATO | `garantitoPersonale + S.cda` |
| **Liquidità disponibile** | `flow().liquidita` | 3.537 | DERIVATO | `inc − grfm − prioritariP1 − garantito` |

### B.2 · Costi strutturali `S.voci[]`

Array di % del fatturato:

| i | Nome | pct | € (=pct×inc/100) | Note |
|---|---|---:|---:|---|
| 0 | GRFM Holding | 2,00 | 2.727,26 | usata a monte in `flow` |
| 1 | Costi fissi | 24,80 | 33.818 | mostrato in dashboard, NON ri-usato in cascata |
| 2 | Costi variabili | 15,30 | 20.863 | idem |
| 3 | Accantonamenti | 2,00 | 2.727,26 | idem |
| 4-... | Utili % | vari | | voce visualizzativa |

### B.3 · S.sistemaFissi — dettaglio per area

Totale: **43.994,28** in 172 voci (contate). Ripartizione per `areaPF`:

| Area PF | # voci | Fisso € | Variabile € |
|---|---:|---:|---:|
| Sistema | 91 | 6.681,40 | 4.706 |
| Personale | 20 | 6.688 | 0 |
| Soci | 4 | 19.200 | 0 |
| Servizi/Consulenze | vari | vari | 6.719 |

*(Il dettaglio esatto per riga richiede l'esplorazione di `S.sistemaFissi[]`, ~180 voci.)*

### B.4 · S.prioritari[] — voci P1 aggregate

10 voci seed (F24 DMRP 202,09 · F24 INAIL 383,31 · Alleata TFR 507,03 · Enasarco 767,82 · Leasing VW 153,52 · Leasing Immobile 961,15 · F24 IVA 383,89 · F24 IMU 188,08 · OSM IVA 2.541,67 · Accantonamento 0). Totale ≈ 6.088,56 €/mese (priorità 1).

### B.5 · Budget per area (input `.budget` + derivato)

Somma: `budgetAreeFisso = 0`, `budgetAreeVar = 78.013 €/mese`.

| Area | fisso € | variabilePct | € totale al mese |
|---|---:|---:|---:|
| comm | 0 | 17,25 | 23.522,62 |
| prod | 0 | 11,31 | 15.422,66 |
| amm | 0 | 10,46 | 14.263,57 |
| form | 0 | 8,50 | 11.590,86 |
| sorvsan | 0 | 0,00 | 0 |
| mkt | 0 | 5,77 | 7.868,14 |
| sis | 0 | 3,92 | 5.345,43 |
| altre (rto, asf, centri, …) | 0 | 0 | 0 |

### B.6 · Fornitori — dettaglio per area (elenco `a.fornitori[]`)

| Area | Fornitori | fornitoreFisso € | Note |
|---|:-:|---:|---|
| comm | 6 (Raia, Rufolo, Mancini, Giusti, Gaziano, Spina) | 3.729,85 | provvigioni agenti |
| form | 14 (docenti esterni: Marchiaturificio Crete, Pagni, Baessato, Vega, Morelli, De Angelis, Felici, Lascialfari, Greco, Assoservizi, Melani, Stomeo, Masserelli, Borrani) | 1.703,52 | Somma dettaglio = fornitoreFisso |
| sorvsan | 10 (Stemar, Job & Safety, Alba, Biscioni, Studi Medici Toscana, Chezzi, SecureLab, Galassi, Synlab Med, G.A.M.M.A.) | 7.201,77 | |
| c_antincendio | (fornitori dettagliati Barbagli 17.817, ESMA 9.137, Tavanti 6.808, GTA 4.936 annui) | 3.466,00 | valMensile = annuo/12 |
| c_ambiente | (Gracci acustico, Ecogam fumi/polveri) | 3.969,66 | |
| c_verifiche_terra | ? | 285,00 | |
| c_medici_competenti | (ereditati da sorvsan a runtime — spostati non duplicati) | 0 (spostato) | via `EREDITA_FORNITORI_D` |
| c_docenti | (ereditati da form) | 0 (spostato) | idem |
| altre (mkt, amm, sis, rto, asf, cantieri, rspp, documenti, …) | 0 | 0 | senza fornitori |

**Totale fornitori (invariante)**: `Σ a.fornitoreFisso` = **20.356,43 €/mese** (= 244.277 annui). L'elenco `.fornitori[]` è **detail**: la funzione `centroCostoFisso(a)` usa la lista se presente, altrimenti `.fornitoreFisso` come fallback — non sono sommati due volte.

### B.7 · Personale (garantito, natura)

- **Soci** (`natura=socio`, `fissoMensile`): 4 × 4.800 = **19.200 €/mese**. p01, p02, p03, p04.
- **Dipendenti** (`natura=dipendente`, `costoAziendaMensile`): 13 persone, ~21.716 €/mese (dettaglio sotto in §C). Il campo autoritativo è `p.costoAziendaMensile`; se assente si prende dal `matchDipendenteRecord` in `S.importDipendenti`.
- **P.IVA** (`natura=piva`, garantito=0): 9 persone (Raia, Necci-CA, agenti p_dav/p_alb/p_gig/p_mru, Alessandro, Michela, pBO1, pMKT).

**garantito personale invariante**: 40.916,15 €/mese.

### B.8 · §F compensi responsabili

| Voce | Percorso | Valore |
|---|---|---:|
| Enabled | `S.compensiF.enabled` | `true` |
| Soglia KPI | `S.compensiF.soglia` | 80 % |
| Base aliquota | `S.compensiF.base` | 0,01 (1,0 %) |
| Incremento | `S.compensiF.incremento` | 0,0005 (0,05 %) |
| Cap | `S.compensiF.cap` | 0,025 (2,5 %) |
| Priorità pool | `S.compensiF.priorita` | 2 |
| Totale richiesto | `totCompensoFRichiesto()` | **0** (tutti KPI a 0) |

**Formula** (per persona `p` con `isRespF(p) = a`, `K = kpiA(a)`):
- `r(K<soglia) = 0`; `r(soglia..100) = base × (K−soglia)/(100−soglia)`; `r(100..130) = base + inc × (K−100)`; `r(K≥130) = cap`.
- `compenso = r × margine_diretto_area` (`= areaBudget(a) − areaCosto(a)`, min 0). Le aree con `esclusaDaCompensiF=true` sono saltate da `isRespF`.

### B.9 · Premi §9 per area — `S.premi.aree`

| Voce | Tipo | Note |
|---|:-:|---|
| `S.premi.priorita` | INPUT (default 3) | prio della voce Premi nel pool |
| `S.premi.aree[id].pctMargine` | INPUT (default 10 %) | pool proposto = base × pct/100 |
| `S.premi.aree[id].slider` | INPUT | override CDA (null = usa proposto) |
| `S.premi.aree[id].modo` | INPUT | mese/trimestre |
| `S.premi.aree[id].distribuzione[pid]` | INPUT | € per persona |
| `S.premi.aree[id].maturato / liquidato / storico` | DERIVATO | aggiornati alla chiusura mese |
| `premioProposto(a)` | DERIVATO | `areaMarginBase(a) × pctMargine/100` se KPI ≥ soglia, else 0 |
| `premioEffettivoArea(a)` | DERIVATO | `slider ?? proposto`, min 0 |
| `premiTotaleRichiesto()` | DERIVATO | `Σ effettivo di aree con KPI` |

`areaMarginBase(a)`: se `a.id ∈ CENTRI_IDS` → `centroMargine(a)`, altrimenti se ha rollup di figli chiusi → `roll.margine`, altrimenti `budget − costo`.

Attualmente K = 0 per tutte le aree → premi = 0.

### B.10 · Erogato per servizio (§I)

`S.erogatoServizi[centroId] = [{id, data, servizio, valore, tipologia, note, considera:false, _dedupKey, _fromImport}]`.

- Default: array vuoto per ogni centro → nessun effetto sui centri.
- `centroValore(c) = base + Σ (righe con considera=true).valore`.
- `centroMargine(c) = centroValore − centroCostoFisso − centroCostoVar`.

### B.11 · Catalogo servizi (§P2)

`S.cataloghiServizi[centroId] = [{id, nome, tipologia}]` — seed lazy dai VOCI_TEC_DEFAULT per centri tecnici, placeholder per altri. `S.tipologieErogato = ['Standard','Extra','Ricorrente','Una tantum','Straordinario']`.

### B.12 · KPI

- **Micro-KPI seed** (`a.micro[]`): 51 KPI totali su 7 aree (vedi §A).
- **KPI custom** (`S.kpiCustom[areaId] = [{id,nome,target,effettivo,unita,note,considera}]`): 0 attualmente.
- **Catalogo proposte** (`KPI_PROPOSTE`): 9 tipi × ~44 proposte (commerciale, produzione, formazione, amministrazione, marketing, sorvsan, segreteria, centro, trasversale). Non nel modello dati, è costante.
- `kpiA(a)` = media dei raggiungimenti dei micro con `kt>0` + kpiCustom con `considera:true`. `null` se nessuno.

### B.13 · Ricavo per centro (§Fase 7 default)

Le 8 unità produttive hanno `ricavoModo='percentuale'`, `ricavoPct` seed:
`sorvsan=20 · c_antincendio=18 · c_documenti=15 · form=15 · c_rspp=12 · c_ambiente=10 · c_cantieri=8 · c_verifiche_terra=2` (Σ=100).

`centroValore(c)` con modo=percentuale = `(ricavoPct/100) × S.incassato + erogatoAttivo`. Base per §F/premi.

### B.14 · Storico e stagionalità

- `S.storicoVendite[anno][sezione][agente] = [12]` — array 2026 popolato ai seed? verifica presente ma vuoto (`storicoVenditeAnni = []` dal dump — nessun anno importato).
- `S.stagionalita = {venduto:[12], incassato:[12], anniBase:[2024,2025]}`.
- `S.incassiSettimanali2026 = 6 settimane demo` (312.816,91 € totali).
- `S.storicoReale = 0 voci` (vuoto).

### B.15 · Riepilogo cascata `flow()` derivati

| Voce | Valore |
|---|---:|
| inc | 136.363 |
| grfm | 2.727,26 |
| prioritariP1 | 75.582,84 |
| garantito (pers+CDA) | 54.516,15 |
| **liquidita** | **3.537** |
| poolP2Rich | 0 (KPI=0 → §F=0; premi=0) |
| poolP3Rich | 0 |
| poolP2Eff / poolP3Eff | 0 / 0 |
| **utili** | **3.537** |

---

## C) MAPPA PERSONE (26 totali)

**Convenzione**: `RESP` = `isResp:true` (flag legacy, alimenta `comp.ore_resp`); `CA` = `isCapoArea:true`; `ESCL` = `escludiDaCalcolo:true`. `§F: X` = area su cui `isRespF` ritorna non-null.

### C.1 · Soci (4) — natura=socio, `fissoMensile:4800`

| id | Nome | area | areaResp | livello | flags | §F | slots | Ruolo principale |
|---|---|---|---|:-:|---|:-:|:-:|---|
| **p01** | Roberto Macinai | comm | comm | C | RESP | **comm** | 2 | Direttore Vendite |
| **p02** | **Marco Macinai** | **mkt** | **mkt** | C | RESP | **mkt** | 4 | Dir. Marketing |
| **p03** | Giovanna Panti | prod | prod | C | RESP | **prod** | 3 | Dir. Produzione |
| **p04** | Francesco Martini | amm | amm | C | RESP | **amm** | 1 | CFO / Dir. Amministrazione |

### C.2 · Responsabili non-soci (con RESP e/o CA)

| id | Nome | natura | area | areaResp | flags | §F | garMens € | Note |
|---|---|---|---|---|---|:-:|---:|---|
| p05 | Alessandro Raia | piva | comm | comm | RESP, CA:comm | — | 0 | Capo Area Fiorentina, in `comm.capiAreaIds` → esclusa §F |
| p06 | Massimo Necci | dip | comm | comm | RESP, CA:comm | — | 2.400 | Capo Area Senese (NON in `comm.capiAreaIds` seed; `capoAreaDi='comm'`) |
| **p07** | Samuele | dip | prod | prod | RESP | — | 2.205,85 | Responsabile RTO (`rto.responsabiliIds=['p07']`). RTO budget=0 → §F=0 |
| p11 | Niccolò | dip | form | form | RESP | **form** | 2.578,80 | Responsabile Formazione |

### C.3 · Gaia (caso speciale)

| id | Nome | natura | area | areaResp | flags | §F | garMens € | Note |
|---|---|---|---|---|---|:-:|---:|---|
| **p12** | Gaia | dip | prod | prod | — | — | 1.561,76 | Nel modello dati vive in `area=prod, areaResp=prod`, MA è la **responsabile designata di Segreteria** (`sis.responsabiliIds=['p12']`). `sis.esclusaDaCompensiF=true` → **§F sempre 0**. |

### C.4 · Agenti Commerciale (5 P.IVA)

| id | Nome | natura | area | livello | garMens € |
|---|---|---|---|:-:|---:|
| p_dav | Davide Gaziano | piva | comm | A | 0 |
| p_alb | Alberto Mancini | piva | comm | A | 0 |
| p_gig | Gigliola | piva | comm | A | 0 |
| p_mru | Mario Rufolo | piva | comm | A | 0 |
| pMKT | Marketing (agente collettivo?) | piva | comm | A | 0 |

Gli agenti sono raggruppati in `S.areeCA[]` (`areeCA[ac_raia] = {caId:p05, agentiIds:[p_mru,p_alb]}`, `areeCA[ac_necci] = {caId:p06, agentiIds:[p_dav,p_gig,p01,p02,p03]}`).

### C.5 · Dipendenti Produzione (9)

| id | Nome | natura | area | livello | costoAziendaMensile € |
|---|---|---|---|:-:|---:|
| p_sil | Silvia | dip | prod | A | 2.588,87 |
| p_eli | Elia | dip | prod | A | 1.316,83 |
| p_pel | Francesco Pelliccia | dip | prod | A | 808,95 |
| p_sim | Simone | dip | prod | A | 1.813,47 |
| p_guc | Guccio | dip | prod | A | 1.459,08 |
| p_ale | Alessandro | piva | prod | A | 0 |
| p_ces | Cesare | dip | prod | A | 602,10 |
| p_bio | Alessandro Biotti | dip | prod | A | 2.023,16 |

### C.6 · Dipendenti Amministrazione (3)

| id | Nome | natura | area | livello | costoAziendaMensile € |
|---|---|---|---|:-:|---:|
| p15 | Mattia Guardiani | dip | amm | A | 1.044,61 |
| p_val | Valentina Caserta | dip | amm | A | 1.312,67 |

### C.7 · Segreteria/Marketing agente

| id | Nome | natura | area | livello | garMens € |
|---|---|---|---|:-:|---:|
| p_mic | Michela | piva | mkt | A | 0 |
| pBO1 | Segreteria Direzione | piva | sis | A | 0 |

### 🔎 Focus richiesto: dove sta MARCO MACINAI

- **id**: `p02`
- **natura**: socio
- **`area = 'mkt'`** (Marketing)
- **`areaResp = 'mkt'`**
- **`fissoMensile = 4.800 €/mese`** (garantito P1 come tutti i soci)
- **Ruolo principale**: `Dir. Marketing`
- **In §F**: `mkt.responsabiliIds = ['p02']` (Marco) — attualmente §F scatta su `mkt`, non su `comm`
- **Marketing** (`mkt`) è **sotto-area di `comm`** (`mkt.parentId = 'comm'`), con budget proprio `variabilePct=5,77` → 7.868,14 €/mese
- **Slot attivi**: 4 (`resp_mkt` + altri, dettaglio in `p.slots[]`)
- **Nell'organigramma SVG**: appare come card figlia di comm, colore `#A32020` (rosso Marketing)

**Domanda operativa per il mapping PF**: nel PF Marco ha venduto/incassato propri. In app:
- Se il "suo" venduto è comunicazione/lead generation → naturale nell'area `mkt` (già dov'è)
- Se il suo venduto è **commerciale** (contratti clienti generati per SSI dalla comunicazione) → potrebbe voler entrare come voce distinta nel Commerciale, tenendo mkt come area-costo campagne
- Nessuna delle due opzioni richiede modifiche allo schema: cambiare `p02.area/areaResp` o distribuire i suoi slot su più aree.

---

## D) PUNTI DI INGRESSO DATI

### D.1 · Costo reale personale per persona/mese

**Dove atterra**:
- `S.personale[i].costoAziendaMensile` (autoritativo)
- Fallback: `S.importDipendenti[i]` con `.nome` + `.costoAziendaMensile` → matching automatico con Roberto/Gaia/… via `matchDipendenteRecord(p)` (bipartite match sul nome). Se non c'è `costoAziendaMensile` sulla persona, prevale il match live.

**Formula**: `garantitoNatura(dip) = costoAziendaMensile` (mensilizzato).

**Import esistente**: la pagina *Import* legge `26_Dettaglio costi dipendenti.xlsx` — col B = costoAziendaAnnuo, mensile = B/12.

### D.2 · Storico vendite / target per mese e area

**Dove atterra**:
- **Storico**: `S.storicoVendite[anno][sezione][agente] = [12]` — 12 valori mensili. Anni 2024/2025 già previsti per stagionalità (§C), 2026 operativo.
- **Import esistente**: la pagina *Import* accetta `template_import_storico_vendite.xlsx` (§B) con blocchi ANNO/VENDUTO/TACITI RINNOVI/INCASSATO × agente × 12 mesi. Dedup su `importKey = anno|sezione|agente`.
- **Target KPI**: `S.aree[i].micro[j].kt` (target seed 101 su molti) e `S.kpiCustom[areaId][j].target`. Modificabili anche dal pannello globale 🎯 KPI & target (`renderKpiTargetsPage`) con import CSV batch (`importKpiCustomFile`, colonne `area,nome,target,effettivo,unita,note`).

### D.3 · Costi fissi vs variabili

**Dove atterra**:
- `S.sistemaFissi[i] = {id, nome, cat, areaPF, natura:'fisso'|'variabile', areaId, val, importKey?, escludi?}`
- `natura` distingue fisso vs variabile.
- `areaId` collega la voce a un'area (`comm`, `prod`, `amm`, `sis`, `mkt`, `form`, `sorvsan` o null se overhead sistema).
- `areaPF` è il "Blocco" originale del PF (Sistema/Personale/Soci/Servizi/Consulenze), usato per raggruppare in import.
- `importKey` (backfill §Fase 12 non applicato in questo repo, ma il campo è previsto): dedup su re-import PF.
- `escludi` (§Audit): toggle 👁 UI per ignorare senza cancellare.

**Import esistente**: `handleImportPF()` legge PF SI 2026.xlsx foglio "2026 PF", col A→areaPF (Sistema/Commerciale/…), riga vs 151 → natura (fisso se sopra, variabile se sotto), col D→val annuo (÷12 al mese).

**Aggregazione visualizzativa**: `areaFissiVariabili(area, includeChildren)` raggruppa `S.sistemaFissi[]` per area (con drill-down alle voci). Consumato da renderStruttura / renderSistemaPage.

### D.4 · Venduto / fatturato / incassato per area

**Dove atterra** — 4 canali paralleli, tutti già esistenti:

1. **`S.storicoVendite[anno][sezione][agente]`** (venduto/incassato PER AGENTE, 12 mesi). Sezione = area/canale (comm, mkt, …).
2. **`S.datiArea[areaKey]`** (dati mensili per area):
   - `comm.agenti[personaId] = {venduto, incassato, provvigioni, premi, clientiNuovi, sinergie}`
   - `form = {oreErogate, personeAula, corsiErogati, attestatiEmessi, valoreEconomico, note, _per: {formatoreId: {ore,persone,corsi,attestati,valore}}}`
   - `amm = {cashFlow, fatturePagatePct, f24Ok, proformaNr, dsoGiorni, riduzioneCosti, note}`
   - `mkt = {costoAgenziaEur, costoAdsEur, fornitoriMKT:[], programmiMKT:[], vociExtra:[], note}`
   - `sorvsan = {visiteEffettuateNr, nuoviMcNr, note}`
   - `seg = {chiamateNr, scadenzeRispettatePct, richiesteEvase24hPct, erroriNr, vociExtra:[], note}`
3. **`S.erogatoServizi[centroId]`** (righe erogato per servizio: data, servizio, valore, tipologia, considera). Alimenta `centroValore` se `considera=true`.
4. **`S.incassatoMensile2026`** (7 valori demo gen-lug). Usato come default incassato. Serie mensile globale, non per area.

**Fatturato per area**: NON esiste un campo unico "fatturato area". Si deriva:
- Dalla ripartizione %: `areaBudget(a) = (a.incPct/100) × S.incassato` — quota teorica del fatturato imputata all'area.
- Dai centri tecnici: `centroValore(c)` (percentuale/tecnico/manuale + erogato attivo).
- Dagli agenti commerciali: `S.datiArea.comm.agenti[pid].venduto/incassato`.

**Import esistente per venduto**: `parseStoricoVenditeSheet()` (già scritto). Nessun import per `S.datiArea` (attualmente inserimento manuale nelle pagine area). Nessun import per `S.erogatoServizi` (c'è template ma richiede import mensile per centro).

---

## Note operative per il futuro import PF

1. **Fornitori totali (invariante) = 20.356,43** viene dalla somma dei `fornitoreFisso` di area. La lista `fornitori[]` di ogni area è coerente (somma = fornitoreFisso). Il PF darà i valori annui → dividere ÷12 al mese per popolare `valMensile`.
2. **Sistema (invariante) = 43.994,28** viene da `Σ S.sistemaFissi[].val`. In `sistemaFissiPerArea` il seed ha ~180 voci categorizzate per `areaPF`; l'import può refresh via `importKey` (backfill Fase 12 disponibile a colpo, ma il repo attuale non ce l'ha attiva — verificare prima di importare).
3. **Garantito (invariante) = 40.916,15** = 19.200 soci + Σ `costoAziendaMensile` dipendenti (13 dip = 21.716,15). L'import dipendenti aggiorna `costoAziendaAnnuo`/`costoAziendaMensile` per matching su nome.
4. **Liquidità (invariante) = 3.537** è derivata: cambia se cambia inc, grfm, prioritari o garantito. Attenzione all'import: cambiare l'incassato reale sposterà la liquidità.
5. **Marco (p02)** vive in `mkt`. Se l'import PF ha un suo venduto/incassato, decidere se popolarlo in `S.datiArea.comm.agenti['p02']` (già presente come option) oppure creare un canale `datiArea.mkt` dedicato (ora non esiste, solo costi campagne).
6. **Import ha un pattern chiaro**: anteprima + conferma (`pendingImport.pf` / `.previsionale` / `.storico` con `escludi` flag per riga), dedup su `importKey` per PF e su `anno|sezione|agente` per storico. Additivo, mai sovrascrittura silenziosa.
7. **Aree con `chiusa=true`** entrano nel rollup del parent (§5.1). I 6 centri tecnici sotto ASF sono chiusi → il loro margine confluisce nel rollup di `prod`. Se l'import popola `centroValore` reale, il rollup si aggiorna automaticamente.

---

**FINE RICOGNIZIONE — nessuna modifica al codice, nessun commit.**

Prossimo passo (fuori scope di questo blocco): tu porti il PF al tuo interlocutore, che con questa mappa saprà esattamente dove atterrare ogni valore. Quando torna con la mappatura, si aprirà un branch `import-pf-implement` per scrivere gli adapter di import.

---

## STORICO — ricognizione import

**Data**: 2026-07-28. Sola lettura. Nessuna modifica al codice, nessun commit.
Baseline verificata: **13/13 smoke verdi** + i 4 invarianti ai valori attesi
(43.994,28 / 40.916,15 / 3.537 / 20.356,43).

### 1) Pulsante / accesso

**Pagina UI**: **"Import"** (nav sidebar `Analisi → Import dati`, `goPage('import')`).
Dentro la pagina c'è la card *"template_import_storico_vendite.xlsx"* con:

- Sottotitolo: *"VENDUTO · TACITI RINNOVI · INCASSATO per agente/mese, 2024-2025-2026. 2026 = operativo · 2024-2025 = solo stagionalità (§C)"*
- Input file nascosto: `<input id="import-storico-inp" type="file" accept=".xlsx,.xls" onchange="handleImportStorico(event)">` (line **1431**)
- Pulsante: **"Carica storico vendite"** che triggera il click sull'input file (line **1432**)
- Etichetta di stato: `<span id="import-storico-status">` per l'esito

**Catena delle chiamate**:

1. Utente clicca "Carica storico vendite" → apre picker file
2. Al file selezionato: `handleImportStorico(event)` (line **2151**)
   - `FileReader` in ArrayBuffer → `XLSX.read()`
   - Chiama `parseStoricoVenditeSheet(wb)` (line **2123**)
   - Se righe > 0: `pendingImport.storico = righe` + status verde con nome file, nr righe, anni
   - Chiama `renderImportPreview()` per mostrare l'anteprima
3. Preview: card verde riepilogo (nNew ex novo, nUpd aggiornate); poi per ogni anno un box con tabella righe (checkbox per riga per escludere con `toggleImportRow('storico', idx)`)
4. Utente clicca *"✓ Conferma e applica"* → `applyImport()` (line **2354** button, logica **2485-2495**)
5. `applyImport` scrive in `S.storicoVendite` — non tocca altri campi di calcolo

**Nessun ricalcolo automatico degli indici di stagionalità dopo l'import**: c'è un pulsante separato *"↺ Ricalcola dallo storico"* nell'editor stagionalità (Struttura & aree, line **6606**) che chiama `ricalcolaStagionalita()`.

### 2) Formato atteso del file

Struttura del **foglio a blocchi** (line 2118-2149):

- Il parser cerca **il primo foglio dell'xlsx che contenga almeno una cella `ANNO YYYY`** in colonna A (regex `/^ANNO\s+\d{4}/i`).
- Legge le righe come `header:1` array-of-arrays. Colonna A = indice 0, B..M = 1..12.
- **Marker di sezione** riconosciuti in colonna A (uppercase, mappa `STORICO_SEZIONI` line **1964**):
  - `VENDUTO` → sezione `venduto`
  - `TACITI RINNOVI` → sezione `taciti`
  - `INCASSATO` → sezione `incassato`
- **Marker anno**: righe con `ANNO 2024` / `ANNO 2025` / `ANNO 2026` → setta `anno` corrente
- **Riga di intestazione mesi**: riga con `gen` in colonna A → skippata (ignorata)
- **Riga agente**: qualunque altra riga con testo in colonna A + almeno un numero in B..M
  - Colonna A = **nome agente** (stringa esatta, usata come chiave)
  - Colonne B..M = 12 valori mensili numerici (gen → dic). `parseFloat` con fallback 0.
  - Se **nessun valore numerico** nella riga → skippata

**Riga strutturata prodotta**:
```
{
  anno: 2026,
  sezione: 'venduto',
  sezLabel: 'VENDUTO',
  agente: 'Roberto Macinai',
  mesi: [gen, feb, mar, apr, mag, giu, lug, ago, set, ott, nov, dic],
  tot: Σ mesi,
  importKey: '2026|venduto|Roberto Macinai'
}
```

**Matching agenti — punto importante**:
- **NESSUN matching automatico** con `S.personale`. Il nome della riga in colonna A viene usato **letteralmente come chiave stringa** in `S.storicoVendite[anno][sezione][agente]`.
- Se scrivi "R.Macinai" invece di "Roberto Macinai", crea un record separato.
- Non c'è normalizzazione (case, spazi, punti). Il matching è quindi affidato interamente al template Excel.

**Dedup su importKey**:
- `importKey = anno + '|' + sezione + '|' + agente` (formato stringa esatto)
- In `applyImport` (line **2488-2494**): se esiste già `sv[anno][sezione][agente]` → aggiorna (mai duplica), altrimenti crea. Il conteggio "nuove/aggiornate" viene mostrato in preview via `renderImportPreview` (line **2325-2326**).
- L'utente può escludere singole righe dall'anteprima (checkbox → `r.escludi=true`, filtrate in applyImport).

**Righe di intestazione ammesse ma non usate** (documentate dal codice):
- Un foglio con più istruzioni all'inizio è OK: il parser cerca solo il primo foglio con `ANNO YYYY`.
- Non c'è nessun check di somme, coerenze, formattazioni particolari.

### 3) Dove atterrano i dati

Struttura reale a runtime:

```
S.storicoVendite = {
  2024: {
    venduto:    { 'Roberto Macinai': [12], 'Marco Macinai': [12], ... },
    taciti:     { 'Roberto Macinai': [12], ... },
    incassato:  { 'Roberto Macinai': [12], ... }
  },
  2025: { venduto:{...}, taciti:{...}, incassato:{...} },
  2026: { venduto:{...}, taciti:{...}, incassato:{...} }
}
```

- **Default seed**: `S.storicoVendite = {}` (line **2770** in DEF).
- **Migrazione v7** (line **3920**): `if(!s.storicoVendite) s.storicoVendite = {};` — solo garantisce che l'oggetto esista.
- **Attualmente NEL DEMO**: `Object.keys(S.storicoVendite) = []` (nessun anno importato).
- **Nessun campo aggiunto oltre `[12]`**: il valore è direttamente l'array dei 12 mesi (non wrappato in oggetto). Se dopo l'import volessi aggiungere metadata per agente, servirebbe cambiare struttura.

### 4) LEGAME STORICO → TARGET (PUNTO CHIAVE)

**Non esiste** un pipeline diretto "dallo storico deriva i target del mese".

Cosa c'è invece:

**(a) Ponte parziale via STAGIONALITÀ** — `ricalcolaStagionalita()` (line **5078**):
- Prende `S.storicoVendite[anno][sezione]` per gli anni in `S.stagionalita.anniBase = [2024,2025]` (default)
- Somma i 12 mesi su tutti gli agenti, poi calcola `indice[mese] = mese / avg_mensile × 100`
- Scrive in `S.stagionalita.venduto = [12 indici]` e `.incassato = [12 indici]`
- **NON tocca** i target `micro[].kt` né `kpiCustom[].target`
- **NON usa** il 2026 come base (solo i "anni base" per stagionalità, default 2024/2025)

**(b) Uso degli indici da parte del render KPI** — `targetDestag(targetMedio, sezione, mese)` (line **5073**):
- Formula: `targetMedio × stagIndice(sezione, mese) / 100`
- Chi lo chiama: `renderAreaKPIInto` (line **9027**) — mostra accanto al target medio il "target destagionalizzato del mese" **SE il micro-KPI ha un tag `m.stag` valorizzato** (`venduto` o `incassato`, selezionato a mano dall'utente nella card KPI).
- **Puramente visualizzativo**: non modifica `m.kt`, non entra in `kpiA(a)`, non entra in §F.
- Il target medio `m.kt` resta quello inserito a mano dall'utente (o dal seed DEF 101).

**Conclusione esplicita**: **il ponte "storico → target del mese" NON esiste**. L'infrastruttura di stagionalità esiste (calcolo indici + funzione destag + tag `m.stag` per KPI), ma:

1. Nessuna funzione **legge** `S.storicoVendite` per **suggerire** o **impostare** il target medio (`m.kt`) di un KPI.
2. Nessuna funzione dello storico 2026 (dato operativo) viene usata come confronto/anno-precedente per generare target del mese corrente.
3. Il tag `m.stag` è opt-in per singolo KPI e non collega semanticamente allo storico dell'area.

**Il ponte va costruito come pezzo a parte**. Le opzioni ragionevoli, senza toccare gli invarianti:

- **Opzione A — Manuale con suggerimento**: pulsante "Suggerisci target dallo storico" nella scheda KPI o nel pannello 🎯 KPI & target, che apre una preview con "stesso mese anno precedente" / "media 3 mesi" / "crescita %" (parametri a mano). Applicare = scrivere `m.kt` / `kpiCustom.target` con dedup.
- **Opzione B — Automatico su richiesta**: chiama `ricalcolaTargetDaStorico(sezione, formula)` che itera sui micro/kpiCustom taggati stagionalmente e ne aggiorna il target medio dallo storico.
- **Opzione C — Solo lettura**: mostra vicino ai KPI di area il "riferimento storico" (stesso mese anno precedente) ma non modifica nulla — l'utente decide.

In tutti e tre i casi il touching di `m.kt` o `kpiCustom.target` **non tocca invarianti** (i target sono input per KPI %, che sono input per §F e premi — ma §F e premi restano al default = 0 finché il risultato non è compilato).

### 5) Impatto invarianti — importare storico

**Confermato: importare storico NON tocca la cascata `flow()` e lascia i 4 invarianti IDENTICI.**

Perché in una riga:
> `S.storicoVendite` **non è referenziato in `flow()`** — non entra in `totSistema` / `totTasse` / `totPersonale` / `garantitoNatura` / `areaBudget` / `areaCosto` / `S.prioritari` / `S.voci`. Al massimo alimenta gli **indici di stagionalità** (`S.stagionalita.venduto/incassato`) che sono usati solo dalla funzione `targetDestag()` — puramente visualizzativa, non entra in cascata.

Riferimenti nel codice a `S.storicoVendite` (grep completo):
- **Lettura**: `renderImportPreview` (preview aggiornata vs nuova), `ricalcolaStagionalita` (indici), `renderStagionalitaEditor` (mostra anni disponibili).
- **Scrittura**: `applyImport` (solo qui, con dedup per importKey), migrazione v7 (garantisce `= {}` esistente).
- **Zero riferimenti in `flow()`, in `totSistema/totTasse/totPersonale/garantitoNatura`, in `calcSlot`, in `calcPersona`, in `areaBudget/areaCosto`, in `centroValore/centroMargine`.**

**Un solo caveat**: se l'utente **premesse manualmente** *"↺ Ricalcola dallo storico"* dopo l'import, cambierebbero `S.stagionalita.venduto/incassato`. Questi indici però:
- Non entrano in `flow()`
- Modificano solo il target destagionalizzato mostrato nella UI dei micro-KPI con `m.stag` settato
- Non toccano `m.kt` (target medio) → `kpiA(a)` invariato → §F e premi invariati → cascata invariata → invarianti invariati.

**Nessun punto in cui l'import storico toccherebbe i 4 invarianti.**

---

**FINE RICOGNIZIONE STORICO — nessuna modifica al codice, nessun commit, nessun push.**
