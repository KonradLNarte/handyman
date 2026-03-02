# Resonansia — Product Specification v1.0

> "Sju tabeller. Tusen yrken. En plattform."

**Status:** DRAFT — awaiting review
**Senast uppdaterad:** 2026-02-28
**Författare:** Snack & Verkstad + Claude

---

## 0. Hur man laser denna spec

Denna spec definierar **VAD** systemet ska gora och **VARFOR**, aldrig **HUR** det ska implementeras.

- **SKALL** (MUST) = obligatoriskt krav. Systemet ar inte fardigt utan detta.
- **BOR** (SHOULD) = starkt onskvartt. Kan skjutas till senare release med motivering.
- **KAN** (MAY) = valfritt. Implementeras om det ger tydligt vardet.
- Varje krav har ett unikt ID (t.ex. `P-01`, `DM-03`, `AI-12`) for sparbarhet.
- Teknikval (sprak, ramverk, databas, hosting) specificeras INTE. Specen ar teknikagnostisk.

---

## 1. VISION & DESIGNPRINCIPER

### 1.1 Vision

Resonansia ar ett AI-forst affärssystem for människor som utfor arbete at andra — hantverkare, installatörer, trädgårdsarbetare, städföretag, och alla andra serviceyrken.

Systemet fångar allt som existerar, alla relationer, och allt som händer i en verksamhet. Det gör det begripliga synligt och det komplexa enkelt. Det döljer aldrig.

### 1.2 Designprinciper

| ID | Princip | Innebörd |
|----|---------|----------|
| DP-01 | **Människan först, systemet anpassar sig** | Ingen användare ska behöva lära sig ett nytt gränssnitt. Systemet möter människan där hon redan är: i WhatsApp, i SMS, i sin e-post, i en webbläsare. |
| DP-02 | **AI som mellanhand, aldrig som beslutsfattare** | AI tolkar, föreslår, genererar och översätter. Den fattar aldrig beslut åt användaren. Varje AI-handling är transparent och korrigerbar. |
| DP-03 | **Sju tabeller — inget mer** | All affärslogik representeras i sju konceptuella entiteter. Komplexitet hanteras genom komposition, inte genom nya tabeller. |
| DP-04 | **Nätverkseffekt genom generositet** | Free tier är användbar — inte en demo. Varje inbjuden underentreprenör är en potentiell ny kund. Tröskeln till värde ska vara noll. |
| DP-05 | **Transparens framför magi** | Användaren ska alltid kunna se varifrån en siffra kommer, varför AI föreslår något, och vad som händer härnäst. |
| DP-06 | **Offline-kapabel, synk-tolerant** | Fältarbetare har inte alltid uppkoppling. Systemet ska fungera utan nät och synkronisera korrekt efteråt. |
| DP-07 | **Global arkitektur, lokal relevans** | Datamodellen är branschagnostisk och skalbar till miljoner tenants. Men varje tenant upplever ett system byggt för sin bransch, sitt språk, sin region. |

---

## 2. PERSONAS & ANVÄNDARRESOR

### 2.1 Primärpersonas

#### P-01: Kimmo — Företagaren

| Attribut | Värde |
|----------|-------|
| Roll | Ägare, Vi Tre Målar Sverige AB |
| Storlek | 3 anställda + 2 underentreprenörer |
| Digital mognad | Använder smartphone dagligen, Fortnox för bokföring, resten i huvudet |
| Språk | Svenska (modersmål), engelska (ok) |
| Primärt gränssnitt | Webbapplikation (laptop kvällar/helger), mobilapp (fält) |
| Huvudsakliga smärtpunkter | Kalkyler i huvudet, spåra marginaler, hantera UE, ROT-administration, kundkommunikation |
| Framgångskriterium | "Jag ser hela min verksamhets ekonomi i realtid utan att knappa in siffror." |

#### P-02: Aziz — Underentreprenören

| Attribut | Värde |
|----------|-------|
| Roll | UE-målare, enskild firma |
| Digital mognad | Smartphone, WhatsApp dagligen, begränsad svenska |
| Språk | Arabiska (modersmål), grundläggande svenska, WhatsApp-engelska |
| Primärt gränssnitt | WhatsApp (meddelandebaserat) |
| Huvudsakliga smärtpunkter | Förstå arbetsordrar, rapportera tid, veta var jobbet är, få betalt |
| Framgångskriterium | "Jag får tydliga instruktioner på mitt språk och tidrapporterar genom att skicka en siffra." |

#### P-03: Lisa — Kontorsansvarig

| Attribut | Värde |
|----------|-------|
| Roll | Administratör/projektkoordinator |
| Digital mognad | Hög — använder Fortnox, Excel, e-post, telefon dagligen |
| Språk | Svenska |
| Primärt gränssnitt | Webbapplikation (desktop) |
| Huvudsakliga smärtpunkter | Manuell sortering av följesedlar, fakturamatchning, kunduppföljning, ROT/RUT-hantering |
| Framgångskriterium | "AI flaggar avvikelser innan de blir problem. Jag hanterar undantag, inte rutinärenden." |

#### P-04: Erik & Maria Eriksson — Kunden

| Attribut | Värde |
|----------|-------|
| Roll | Villaägare, beställer målning |
| Digital mognad | Normal — smartphone, BankID, Swish |
| Språk | Svenska |
| Primärt gränssnitt | Utsändningar (e-post, SMS med länkar). Inget konto, ingen inloggning. |
| Huvudsakliga smärtpunkter | Inte veta vad som händer, överraskningsfakturor, otydliga offerter |
| Framgångskriterium | "Jag fick ett statusfoto varje dag och slutfakturan matchade offerten. Inga överraskningar." |

#### P-05: Johan — BRF-Ordföranden

| Attribut | Värde |
|----------|-------|
| Roll | BRF-styrelsens ordförande, beställer löpande underhåll |
| Digital mognad | Normal, föredrar e-post och PDF |
| Primärt gränssnitt | Utsändningar (veckorapporter via e-post, PDF) |
| Huvudsakliga smärtpunkter | Kommunicera status till styrelse, verifiera kostnader, följa tidsplaner |
| Framgångskriterium | "Jag får en veckorapport med foton och ekonomi som jag kan vidarebefordra direkt till styrelsen." |

### 2.2 Användarresor (kritiska flöden)

Varje flöde nedan är ett **end-to-end-scenario** som systemet SKALL stödja fullständigt.

#### UJ-01: Offert till signering

```
Trigger:    Kimmo besöker kund Eriksson
Steg:
  1. Kimmo tar foton av ytorna med sin telefon
  2. Kimmo dikterar eller skriver: "3 rum, 85 kvm, 2 lager,
     tak och väggar, NCS S0502-Y"
  3. → Systemet skapar ett offertunderlag:
       - Beräknar materialåtgång (baserat på kvm + yttyp + produktdata)
       - Föreslår timpris × uppskattade timmar
       - Lägger till ROT-avdrag (30% på arbetskostnad)
       - Genererar en professionell PDF med företagets varumärke
  4. Kimmo granskar, justerar vid behov, godkänner
  5. → Offert skickas till Eriksson via SMS/e-post med en länk
  6. Eriksson öppnar, ser offerten, signerar med BankID
  7. → Systemet skapar ett projekt med offertens rader som budget
Acceptanskriterium:
  - Hela flödet från foto till signerad offert: < 30 minuter
  - Kunden behöver INGET konto eller INGEN inloggning
  - ROT-avdraget beräknas korrekt enligt Skatteverkets regler
  - PDF:en är professionell nog att vinna jobb mot konkurrenter
```

#### UJ-02: Arbetsorder till underentreprenör

```
Trigger:    Kimmo tilldelar Aziz ett jobb
Steg:
  1. Kimmo väljer projekt Eriksson, tilldelar Aziz
  2. → Systemet skickar arbetsorder till Aziz via WhatsApp:
       - På arabiska
       - Med kartlänk till adressen
       - Med checklista (förberedelser, skyddsåtgärder, ytbehandling)
       - Med foton från besiktningen
  3. Aziz bekräftar: trycker "OK" eller svarar "OK"
  4. Varje dag: Aziz skickar ett foto + svarar med antal timmar
  5. → Systemet loggar tid, foton, associerar till projektet
  6. Vid projektslut: Aziz markerar "klart"
  7. → Systemet sammanfattar Aziz insats med timmar, foton, kostnader
Acceptanskriterium:
  - Aziz behöver ALDRIG logga in i en app
  - Arbetsorder visas på Aziz föredragna språk
  - Tidsrapportering sker genom att svara med en siffra i WhatsApp
  - Foton associeras automatiskt till rätt projekt och dag
```

#### UJ-03: Löpande kundrapportering

```
Trigger:    Dagligen under pågående projekt
Steg:
  1. Systemet samlar dagens aktivitet: foton, tidregistrering, material
  2. → Genererar ett dagligt statusmeddelande
  3. Skickar till kunden via dennes föredragna kanal (SMS, e-post)
  4. Meddelandet innehåller:
       - 1-2 foton från dagen
       - Kort sammanfattning: "Dag 3 av 5. Vardagsrum och hall färdiga.
         Imorgon: kök och badrum."
       - Inga kostnadsdetaljer (såvida kunden inte begärt det)
Acceptanskriterium:
  - Kunden får statusuppdatering utan att fråga
  - Inget krav på inloggning eller app
  - Meddelandet är kort, mänskligt, och professionellt
```

#### UJ-04: Fakturering med ROT/RUT

```
Trigger:    Projekt avslutat
Steg:
  1. Lisa (eller Kimmo) markerar projektet som färdigt
  2. → Systemet föreslår en faktura baserat på:
       - Offertens rader (originalbudget)
       - Faktiska timmar (från tidsrapportering)
       - Faktiska material (från följesedlar/events)
       - ROT-avdrag (beräknat på arbetskostnad)
  3. AI flaggar avvikelser:
       - "Materialkostnad 12% högre än offert — vill du justera?"
       - "Aziz rapporterade 4h mer än beräknat — kontrollera."
  4. Lisa granskar, justerar, godkänner
  5. → Systemet:
       a. Genererar faktura-PDF med korrekt ROT-uppdelning
       b. Skickar till kund (kundens andel)
       c. Förbereder ROT/RUT-begäran till Skatteverket
       d. Synkroniserar till bokföringssystem (Fortnox, etc.)
Acceptanskriterium:
  - Fakturan matchar offertens format och villkor
  - ROT/RUT-belopp beräknas korrekt (30% respektive 50%)
  - Avvikelser mellan offert och utfall flaggas INNAN fakturering
  - Fakturadata synkroniseras till externt bokföringssystem
```

#### UJ-05: AI-insikt som förhindrar förlust

```
Trigger:    AI upptäcker anomali i projektekonomi
Steg:
  1. AI analyserar pågående projekt kontinuerligt (bakgrundsjobb)
  2. Upptäcker: "Eriksson-projektet: materialkostnad 15% högre
     än liknande projekt i historiken"
  3. → Notifiering till Kimmo/Lisa:
       "Materialkostnaden på Eriksson-projektet ligger 15%
        över snittet för liknande jobb. De tre senaste
        följesedlarna från Colorama var: [länk].
        Vill du granska?"
  4. Kimmo klickar, ser detaljerna, upptäcker felbeställning
  5. Korrigerar innan kostnaden eskalerar
Acceptanskriterium:
  - AI jämför projekt mot historiska data inom samma tenant
  - Insikten anger specifik orsak och pekar på underliggande data
  - Användaren kan alltid verifiera AI:ns resonemang
  - Ingen insikt levereras utan att visa sin källa
```

#### UJ-06: Underentreprenör blir egen kund (nätverkseffekt)

```
Trigger:    Aziz vill använda systemet för sin egen verksamhet
Steg:
  1. Aziz trycker på en länk i sin WhatsApp-tråd: "Starta eget konto"
  2. → Skapar ny tenant (organisation) på Free-tier
  3. Aziz profil (namn, kontaktinfo, språk) migreras
     från Kimmos tenant (med Aziz samtycke)
  4. Aziz kan nu:
       - Skicka egna offerter (på arabiska eller svenska)
       - Få sina egna kunder
       - Fortsätta ta jobb som UE åt Kimmo (federation-edge)
  5. → Relationen Kimmo ↔ Aziz lever som en federation-edge
       mellan de två tenants
Acceptanskriterium:
  - Onboarding från UE till egen kund: < 5 minuter
  - Befintlig UE-relation bryts inte
  - Aziz data i Kimmos tenant förblir i Kimmos tenant
  - Aziz nya tenant är helt isolerad men kopplad via federation
```

---

## 3. KONCEPTUELL DATAMODELL

Systemet representerar all affärslogik i sju konceptuella entiteter. Denna sektion definierar deras semantik — inte deras fysiska schema.

### 3.1 Entitetsöversikt

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  TENANT  │────▷│   NODE   │────▷│   EDGE   │
│          │     │          │     │          │
│ isolering│     │ existens │     │ relation │
└──────────┘     └────┬─────┘     └──────────┘
                      │
                      ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  LABEL   │     │  EVENT   │     │   BLOB   │     │   DICT   │
│          │     │          │     │          │     │          │
│ vokabulär│     │ händelse │     │  binärt  │     │ semantik │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### 3.2 TENANT — Fysisk isolering

**Definition:** En tenant representerar en organisation i infrastrukturen. Det är den enhet som all data partitioneras kring.

| Egenskap | Beskrivning |
|----------|-------------|
| Identitet | Globalt unik, tidssorterad identifierare |
| Status | Aktiv, Suspenderad, Borttagen |
| Region | Geografisk dataresidenszon (t.ex. EU-nord, US-öst) |
| Skapad | Tidsstämpel |

**Regler:**
- `R-TEN-01`: Varje tenant SKALL ha exakt en region som styr var dess data lagras fysiskt.
- `R-TEN-02`: Tenant-ID SKALL finnas som kolumn i varje datatabell (utom tenant själv och label).
- `R-TEN-03`: All data för en tenant SKALL vara tillgänglig enbart för den tenanten, med undantag av platformglobal data (labels, dict med tenant_id = null).
- `R-TEN-04`: Tenant-deletion SKALL vara mjuk (statusflagga), inte fysisk radering.

### 3.3 LABEL — Kontrollerade vokabulärer

**Definition:** En label är en typad etikett som klassificerar noder, kanter och events. Labels utgör systemets typssystem och är datadefinierat — inte koddefinerat.

| Egenskap | Beskrivning |
|----------|-------------|
| Identitet | Litet heltal (kompakt, cachat) |
| Tenant | NULL = plattformsglobal, UUID = tenant-specifik |
| Domän | Namnutrymme: `node_type`, `edge_type`, `event_type`, `unit`, `locale`, etc. |
| Kod | Unik kod inom domän: `project`, `person`, `hour`, `sek`, `sv`, `ar`, etc. |
| Förälder | Valfri — möjliggör hierarkiska vokabulärer (t.ex. `unit > time > hour`) |
| Sorteringsordning | Bestämmer visningsordning |
| Systemflagga | `true` = kan inte tas bort av tenant |

**Regler:**
- `R-LAB-01`: Labels SKALL ha tre nivåer: Platform (tenant_id = null), Organisation (tenant_id = X), Användare (framtida).
- `R-LAB-02`: Organisationslabels KAN utöka plattformslabels men SKALL INTE kunna ta bort eller dölja dem.
- `R-LAB-03`: Vid uppslagning SKALL org-specifik label prioriteras över plattformsglobal med samma domän+kod.
- `R-LAB-04`: Hela labeltabellen BOR cachas i minnet. Invalidering sker vid ändring via notifieringskanal.
- `R-LAB-05`: Att lägga till en ny typ av affärsentitet (t.ex. "trädgårdsprojekt") SKALL vara en dataoperation (INSERT i label), INTE en kodändring.

**Domäner som SKALL finnas vid lansering:**

| Domän | Exempel på koder | Syfte |
|-------|-----------------|-------|
| `node_type` | `org`, `person`, `project`, `customer`, `supplier`, `product`, `location` | Klassificerar noder |
| `edge_type` | `member_of`, `assigned_to`, `subcontractor_of`, `located_at`, `owns` | Klassificerar relationer |
| `event_type` | `time`, `material`, `photo`, `message`, `quote_line`, `invoice_line`, `adjustment`, `state_change`, `payment` | Klassificerar händelser |
| `node_state` | `draft`, `active`, `in_progress`, `completed`, `archived`, `cancelled` | Nod-status |
| `unit` | `hour`, `minute`, `sqm`, `lm`, `piece`, `kg`, `liter` | Mätenheter |
| `currency` | `sek`, `nok`, `dkk`, `eur`, `usd` | Valutor |
| `locale` | `sv`, `en`, `ar`, `pl`, `tr`, `fi`, `no`, `da` | Språk |
| `blob_kind` | `photo`, `document`, `invoice_scan`, `delivery_note`, `signature` | Blobtyper |

### 3.4 NODE — Allt som existerar

**Definition:** En nod representerar vilken affärsentitet som helst: en organisation, en person, ett projekt, en kund, en produkt, en plats. Nodtypen bestäms av en label.

| Egenskap | Beskrivning |
|----------|-------------|
| Identitet | Globalt unik, tidssorterad identifierare |
| Tenant | Vilken organisation denna nod tillhör |
| Förälder | Valfri — möjliggör hierarki (projekt → rum, org → avdelning) |
| Typ | Label som klassificerar noden (projekt, person, kund, etc.) |
| Nyckel | Valfri, mänskligt läsbar identifierare (t.ex. "P-2026-042") |
| Status | Valfri label som anger nodens tillstånd (draft, active, completed) |
| Data | Flexibel datastruktur (JSON) för typspecifika egenskaper |
| Sökning | Fulltextsökning genererad från data-fältens relevanta delar |
| Tidsstämplar | Skapad, senast uppdaterad |

**Nodtyper som SKALL stödjas vid lansering:**

| Typ | Data-fält (minimum) | Syfte |
|-----|---------------------|-------|
| `org` | `name`, `org_number`, `address`, `phone`, `email`, `logo_url` | Organisationsdata för tenanten |
| `person` | `name`, `email`, `phone`, `language`, `role` | Anställd, kontaktperson, UE-person |
| `customer` | `name`, `address`, `phone`, `email`, `org_number` | Kund (privatperson eller företag) |
| `project` | `name`, `description`, `address`, `start_date`, `end_date` | Arbetsuppdrag |
| `product` | `name`, `sku`, `unit_id`, `default_price` | Artikel/material i katalog |
| `location` | `name`, `address`, `lat`, `lng` | Arbetsplats |
| `supplier` | `name`, `org_number`, `contact_email` | Leverantör |

**Regler:**
- `R-NOD-01`: En nod SKALL alltid tillhöra exakt en tenant.
- `R-NOD-02`: Nodens typ SKALL referera till en giltig label i domänen `node_type`.
- `R-NOD-03`: Nodens status SKALL referera till en giltig label i domänen `node_state` (eller vara null).
- `R-NOD-04`: Data-fältet SKALL valideras mot ett schema definierat per nodtyp (i applikationslagret, inte i databasen).
- `R-NOD-05`: Fulltextsökningen SKALL uppdateras automatiskt när data-fältet ändras.
- `R-NOD-06`: Varje nod KAN ha en föräldranod (parent_id), vilket möjliggör godtyckligt djupa hierarkier.

### 3.5 EDGE — Alla relationer

**Definition:** En kant representerar en riktad, typad relation mellan två noder inom samma tenant.

| Egenskap | Beskrivning |
|----------|-------------|
| Identitet | Globalt unik, tidssorterad identifierare |
| Tenant | Vilken organisation denna kant tillhör |
| Källa | Nod-ID (varifrån relationen går) |
| Mål | Nod-ID (vart relationen pekar) |
| Typ | Label som klassificerar relationen |
| Data | Flexibel datastruktur för relationsspecifika egenskaper |
| Tidsstämpel | När relationen skapades |

**Kanttyper som SKALL stödjas vid lansering:**

| Typ | Källa → Mål | Data-fält |
|-----|-------------|-----------|
| `member_of` | Person → Org | `role`, `start_date` |
| `assigned_to` | Person → Projekt | `role`, `start_date`, `end_date` |
| `subcontractor_of` | Person/Org → Org | `contract_ref`, `rate` |
| `customer_of` | Customer → Org | `since` |
| `located_at` | Project → Location | |
| `supplier_of` | Supplier → Org | `account_number` |
| `uses_product` | Projekt → Produkt | `estimated_qty` |

**Regler:**
- `R-EDG-01`: Källa och mål SKALL tillhöra samma tenant.
- `R-EDG-02`: En unik kombination av (källa, mål, typ) SKALL vara unik inom en tenant (inga dubbla relationer av samma typ).
- `R-EDG-03`: Kanter SKALL INTE vara dubbelriktade implicit. Om en dubbelriktad relation behövs, skapas två kanter.

### 3.6 EDGE FEDERATION — Relationer mellan tenants

**Definition:** En federation-kant representerar en relation mellan noder i olika tenants. Detta möjliggör underentreprenörsnätverk, leverantörsrelationer, och branschkopplingar.

| Egenskap | Beskrivning |
|----------|-------------|
| Identitet | Globalt unik identifierare |
| Käll-tenant + Käll-nod | Avsändande tenant och nod |
| Mål-tenant + Mål-nod | Mottagande tenant och nod |
| Typ | Label som klassificerar relationen |
| Status | Väntande (0), Accepterad (1), Avvisad (-1) |
| Data | Flexibel datastruktur |

**Regler:**
- `R-FED-01`: Federation-kanter SKALL vara consent-baserade. Mottagningstenant SKALL aktivt acceptera.
- `R-FED-02`: Ingen data kopieras mellan tenants — bara pekare.
- `R-FED-03`: Båda sidor KAN se relationen.
- `R-FED-04`: Federation-kanten SKALL INTE partitioneras per tenant (den spänner över tenants).
- `R-FED-05`: Respektive tenant kontrollerar vilken data den exponerar via federationsrelationen.

### 3.7 EVENT — Allt som händer

**Definition:** En event representerar en händelse i verksamheten. Events är append-only — de skapas, men ändras eller raderas aldrig.

| Egenskap | Beskrivning |
|----------|-------------|
| Identitet | Globalt unik, tidssorterad identifierare |
| Tenant | Vilken organisation detta event tillhör |
| Nod | Vilken nod eventet relaterar till (projektet, kunden, etc.) |
| Referens | Valfri — koppling till annan nod (t.ex. leverantör, produkt) |
| Aktör | Valfri — vem som utförde handlingen |
| Typ | Label som klassificerar eventet |
| Kvantitet | Valfritt tal (timmar, kvadratmeter, antal) |
| Enhet | Valfri label (timmar, kvm, styck, etc.) |
| Á-pris | Valfritt pris per enhet |
| Total | Beräknat fält: kvantitet × á-pris |
| Data | Flexibel datastruktur för händelsespecifika egenskaper |
| Tidsstämpel | När händelsen inträffade |

**Eventtyper som SKALL stödjas vid lansering:**

| Typ | Fält som används | Syfte |
|-----|-----------------|-------|
| `time` | qty (timmar), unit_price, actor_id | Tidsregistrering |
| `material` | qty, unit_id, unit_price, ref_id (produkt/leverantör) | Materialförbrukning |
| `photo` | data: {url, caption}, actor_id | Foto/dokumentation |
| `message` | data: {text, channel, direction}, actor_id | Meddelande (in/ut) |
| `quote_line` | qty, unit_id, unit_price, data: {description} | Offertrad |
| `invoice_line` | qty, unit_id, unit_price, data: {description} | Fakturarad |
| `adjustment` | qty, unit_price, ref_id (original event), data: {reason} | Korrigering |
| `state_change` | data: {from_state, to_state} | Statusändring |
| `payment` | qty (belopp), data: {method, reference} | Betalning mottagen |
| `note` | data: {text}, actor_id | Fri anteckning |

**Regler:**
- `R-EVT-01`: Events SKALL vara append-only. Ingen UPDATE eller DELETE.
- `R-EVT-02`: Korrigeringar SKALL göras via kompensation: ett nytt event av typ `adjustment` som pekar på det ursprungliga eventet via `ref_id`.
- `R-EVT-03`: Ekonomiska aggregeringar (offert-total, fakturabelopp, projektmarginal) SKALL alltid beräknas som summan av relevanta events.
- `R-EVT-04`: Varje event med ekonomisk data (qty + unit_price) SKALL ha ett beräknat total-fält.
- `R-EVT-05`: Events SKALL partitioneras by tid (utöver tenant-partitionering) för effektiv arkivering och sökning.
- `R-EVT-06`: Events BOR ha en notifieringskanal som triggar realtidsuppdateringar till prenumeranter.

### 3.8 BLOB — Binärt innehåll

**Definition:** En blob är metadata om en binär fil (foto, dokument, skannat dokument, signatur). Själva filen lagras externt (objektlagring). Blob-tabellen innehåller referens, metadata och associations.

| Egenskap | Beskrivning |
|----------|-------------|
| Identitet | Globalt unik identifierare |
| Tenant | Vilken organisation |
| Nod | Valfri — vilken nod filen tillhör |
| Event | Valfri — vilket event filen skapades i |
| Typ | Label (foto, dokument, fakturascan, följesedel, signatur) |
| URL | Referens till extern lagring |
| Metadata | Flexibel data (filstorlek, MIME-typ, bildmått, EXIF, etc.) |

**Regler:**
- `R-BLO-01`: Binärt innehåll SKALL INTE lagras i databasen. Enbart metadata och URL.
- `R-BLO-02`: URL:er SKALL vara tidsbegränsade (signed URLs) eller åtkomststyrda.
- `R-BLO-03`: Foton tagna via meddelandekanal (WhatsApp, SMS) SKALL automatiskt associeras till rätt projekt och dag.

### 3.9 DICT — Semantik, i18n, metadata

**Definition:** Dict lagrar översättningar, konfiguration, och strukturerad semantisk data. Det är systemets "ordbok" — hur saker kallas, beskrivs, och formateras.

| Egenskap | Beskrivning |
|----------|-------------|
| Identitet | Globalt unik identifierare |
| Tenant | NULL = plattform, UUID = tenant-specifik |
| Scope | Namnutrymme (t.ex. `label.node_type.project`, `ui.dashboard.title`) |
| Locale | Språklabel |
| Värde | Flexibel datastruktur (JSON) med översättning/konfiguration |

**Regler:**
- `R-DIC-01`: Dict SKALL stödja platform-globala och tenant-specifika värden.
- `R-DIC-02`: Dict BOR cachas aggressivt — den läses extremt ofta.
- `R-DIC-03`: Tenant-specifika dict-värden SKALL överskugga plattformsvärden vid uppslag.

---

## 4. SYSTEMKAPABILITETER

Denna sektion definierar vad systemet SKA göra, organiserat i kapabilitetsområden.

### 4.1 Projekthantering

| ID | Krav | Prioritet |
|----|------|-----------|
| CAP-PRJ-01 | Systemet SKALL kunna skapa, uppdatera och arkivera projekt (noder av typ `project`). | MUST |
| CAP-PRJ-02 | Projekt SKALL kunna ha en hierarki (projekt → delprojekt → rum/zon). | MUST |
| CAP-PRJ-03 | Projekt SKALL ha ett tillstånd (draft → active → in_progress → completed → archived). | MUST |
| CAP-PRJ-04 | Projekt SKALL associeras med en kund (edge: customer → project). | MUST |
| CAP-PRJ-05 | Projekt SKALL kunna ha tilldelade personer (edge: person → project med roll). | MUST |
| CAP-PRJ-06 | Projektets ekonomi SKALL beräknas i realtid som summan av dess events (offert, tid, material, faktura). | MUST |
| CAP-PRJ-07 | Systemet SKALL visa projektets marginal (offertsumma − [tidskostnad + materialkostnad]). | MUST |
| CAP-PRJ-08 | Projekt BOR kunna visas på en tidslinje/kalendervy. | SHOULD |

### 4.2 Offertering

| ID | Krav | Prioritet |
|----|------|-----------|
| CAP-OFR-01 | Systemet SKALL kunna skapa offerter som en samling events av typ `quote_line` kopplade till ett projekt. | MUST |
| CAP-OFR-02 | AI SKALL kunna föreslå offertinnehåll baserat på: beskrivning, foton, historiska projekt, produktkatalog. | MUST |
| CAP-OFR-03 | Offerter SKALL genereras som PDF med tenantens varumärke (logotyp, färger, kontaktinfo). | MUST |
| CAP-OFR-04 | Offerter SKALL kunna skickas via e-post, SMS (med länk), eller WhatsApp (med bifogad PDF). | MUST |
| CAP-OFR-05 | Offerter BOR kunna signeras digitalt (BankID i Sverige, eIDAS-kompatibelt i Europa). | SHOULD |
| CAP-OFR-06 | Signerad offert SKALL automatiskt konverteras till ett aktivt projekt med budget baserad på offertens rader. | MUST |
| CAP-OFR-07 | Systemet SKALL beräkna ROT-avdrag (30% på arbetskostnad) och RUT-avdrag (50% på arbetskostnad) korrekt enligt gällande regler, och visa kundens kostnad efter avdrag. | MUST |
| CAP-OFR-08 | Offerter SKALL stödja versionshantering. Ny version skapar nya events, gamla kvarstår. | MUST |

### 4.3 Tidsregistrering

| ID | Krav | Prioritet |
|----|------|-----------|
| CAP-TID-01 | Systemet SKALL kunna registrera tid via: webbapp, mobilapp, WhatsApp/SMS-svar. | MUST |
| CAP-TID-02 | Tidsregistrering via meddelandekanal: användaren skickar en siffra (t.ex. "8") som tolkas som antal timmar. | MUST |
| CAP-TID-03 | Systemet SKALL skapa events av typ `time` med korrekt projekt, aktör, kvantitet, och á-pris. | MUST |
| CAP-TID-04 | Á-pris SKALL kunna komma från: personens standardpris, projektets avtalade pris, eller manuell inmatning. | MUST |
| CAP-TID-05 | Systemet BOR kunna föreslå tidsregistrering baserat på historiska mönster ("Du brukar logga 8h på måndagar — stämmer det idag?"). | SHOULD |

### 4.4 Materialhantering

| ID | Krav | Prioritet |
|----|------|-----------|
| CAP-MAT-01 | Systemet SKALL kunna registrera materialförbrukning som events av typ `material`. | MUST |
| CAP-MAT-02 | Material SKALL kunna registreras via: manuell inmatning, fotografering av följesedel, eller integration. | MUST |
| CAP-MAT-03 | AI SKALL kunna extrahera data från fotograferade följesedlar (OCR + förståelse): artiklar, kvantiteter, priser. | SHOULD |
| CAP-MAT-04 | Systemet SKALL stödja en produktkatalog (noder av typ `product`) som kan vara global eller tenant-specifik. | MUST |
| CAP-MAT-05 | Systemet BOR kunna jämföra faktisk materialåtgång med offertens uppskattning per projekt. | SHOULD |

### 4.5 Fakturering

| ID | Krav | Prioritet |
|----|------|-----------|
| CAP-FAK-01 | Systemet SKALL kunna generera fakturaförslag baserat på ett projekts events (tid + material). | MUST |
| CAP-FAK-02 | Fakturor SKALL genereras som events av typ `invoice_line`. | MUST |
| CAP-FAK-03 | Faktura-PDF SKALL genereras med korrekt: moms (25% / 12% / 6%), ROT/RUT-avdrag, betalningsvillkor, bankuppgifter. | MUST |
| CAP-FAK-04 | Systemet SKALL stödja delbetalning (delfakturering under projektets gång). | MUST |
| CAP-FAK-05 | Fakturadata SKALL kunna synkroniseras till externt bokföringssystem. | MUST |
| CAP-FAK-06 | Systemet BOR stödja e-faktura (Peppol BIS) för offentlig sektor och B2B. | SHOULD |
| CAP-FAK-07 | Systemet BOR kunna ta emot och matcha inkommande leverantörsfakturor (skannade) mot materialevents. | SHOULD |

### 4.6 Kundkommunikation

| ID | Krav | Prioritet |
|----|------|-----------|
| CAP-KOM-01 | Systemet SKALL kunna skicka meddelanden till kunder via: SMS, e-post, WhatsApp. | MUST |
| CAP-KOM-02 | Kunden SKALL INTE behöva skapa ett konto eller logga in för att ta emot information. | MUST |
| CAP-KOM-03 | Utgående meddelanden SKALL loggas som events av typ `message` med kanal och riktning. | MUST |
| CAP-KOM-04 | Systemet SKALL kunna generera automatiska statusuppdateringar till kunden (dagliga/veckovisa). | MUST |
| CAP-KOM-05 | Statusuppdateringar SKALL innehålla: foton från dagen, kort sammanfattning, tidsplan. | MUST |
| CAP-KOM-06 | Kunden SKALL kunna svara på meddelanden, och svar loggas som inkommande events. | SHOULD |
| CAP-KOM-07 | Systemet BOR kunna generera sändlistor/rapporter till tredje part (t.ex. BRF-ordförande). | SHOULD |

### 4.7 Underentreprenörshantering

| ID | Krav | Prioritet |
|----|------|-----------|
| CAP-UE-01 | Systemet SKALL kunna skicka arbetsordrar till UE via WhatsApp/SMS. | MUST |
| CAP-UE-02 | Arbetsordrar SKALL översättas till UE:s föredragna språk. | MUST |
| CAP-UE-03 | Arbetsordrar SKALL innehålla: adress (med kartlänk), arbetsomfattning, checklista, foton. | MUST |
| CAP-UE-04 | UE SKALL kunna tidrapportera via WhatsApp/SMS (siffra = antal timmar). | MUST |
| CAP-UE-05 | UE SKALL kunna skicka foton via WhatsApp som automatiskt associeras till rätt projekt. | MUST |
| CAP-UE-06 | Systemet SKALL spåra UE:s insats per projekt (tid, foton, status). | MUST |
| CAP-UE-07 | UE SKALL kunna bli en egen tenant med ett klick (nätverkseffekt). | MUST |

### 4.8 Ekonomisk överblick

| ID | Krav | Prioritet |
|----|------|-----------|
| CAP-EKO-01 | Systemet SKALL visa tenantens totala ekonomi: pågående projektvärde, fakturerat, betalt, utestående. | MUST |
| CAP-EKO-02 | Systemet SKALL visa projektets ekonomi: offertsumma, nedlagd tid (kostnad), material (kostnad), marginal. | MUST |
| CAP-EKO-03 | Alla ekonomiska siffror SKALL beräknas från events — aldrig från separata aggregattabeller som kan bli osynkroniserade. | MUST |
| CAP-EKO-04 | Systemet BOR visa ekonomiska trender över tid (dashboard med grafer). | SHOULD |
| CAP-EKO-05 | Systemet BOR kunna jämföra projekt mot varandra (benchmarking inom tenant). | SHOULD |

### 4.9 Dokumentgenerering

| ID | Krav | Prioritet |
|----|------|-----------|
| CAP-DOK-01 | Systemet SKALL kunna generera PDF:er för: offerter, fakturor, arbetsordrar, rapporter. | MUST |
| CAP-DOK-02 | PDF:er SKALL vara varumärkta med tenantens identitet (logotyp, färger, typsnitt, kontaktinfo). | MUST |
| CAP-DOK-03 | PDF:er SKALL stödja höger-till-vänster-text (arabiska). | MUST |
| CAP-DOK-04 | Rapporter BOR kunna inkludera foton, ekonomisammanställning, och AI-genererad narrativ text. | SHOULD |
| CAP-DOK-05 | Systemet BOR stödja digitala signaturer på genererade dokument. | SHOULD |

---

## 5. INTERAKTIONSLÄGEN

Systemet har tre fundamentala sätt att interagera med användare:

### 5.1 Konversation (Messaging)

**Definition:** Användaren interagerar med systemet genom meddelandekanaler (WhatsApp, SMS, eller inbyggd chatt).

| ID | Krav | Prioritet |
|----|------|-----------|
| INT-MSG-01 | Systemet SKALL kunna ta emot och skicka meddelanden via WhatsApp Business API. | MUST |
| INT-MSG-02 | Systemet SKALL kunna ta emot och skicka SMS. | MUST |
| INT-MSG-03 | Inkommande meddelanden SKALL klassificeras av AI: tidsrapport, statusfråga, nytt ärende, etc. | MUST |
| INT-MSG-04 | Tidsrapportering via meddelande: användaren skickar siffra, systemet bekräftar med sammanfattning. | MUST |
| INT-MSG-05 | Foton via meddelande SKALL associeras till rätt projekt baserat på kontext (aktiv arbetsorder). | MUST |
| INT-MSG-06 | Alla meddelanden SKALL kommuniceras på användarens föredragna språk. | MUST |
| INT-MSG-07 | AI SKALL kunna generera svar på frågor om projektets status, tid, och ekonomi. | MUST |
| INT-MSG-08 | Varje AI-svar SKALL kunna korrigeras av användaren ("Nej, det var 6 timmar"). | MUST |
| INT-MSG-09 | Systemet SKALL hantera kontext: veta vilket projekt en konversation handlar om utan att användaren anger det explicit. | SHOULD |

**Sekvensdiagram — Tidsrapportering via WhatsApp:**

```
Aziz                    System                     Kimmo (notif.)
  │                        │                            │
  │──"8"──────────────────▶│                            │
  │                        │ AI: klassificera som tidsrapport
  │                        │ Hitta aktiv arbetsorder för Aziz
  │                        │ Skapa event(type=time, qty=8,
  │                        │   node=Eriksson-projektet,
  │                        │   actor=Aziz)
  │◀─"✓ 8h registrerat    │                            │
  │   på Eriksson-proj.    │                            │
  │   Dag 3 av 5."─────── │                            │
  │                        │──notifikation─────────────▶│
  │                        │  "Aziz: 8h på Eriksson"    │
```

### 5.2 Applikation (Webb/Mobil)

**Definition:** Användaren öppnar systemet i en webbläsare eller mobilapp för översikt, administration och detaljarbete.

| ID | Krav | Prioritet |
|----|------|-----------|
| INT-APP-01 | Systemet SKALL ha ett responsivt webbgränssnitt (desktop + mobil). | MUST |
| INT-APP-02 | Dashboard SKALL visa: aktiva projekt, ekonomisk sammanfattning, AI-insikter, senaste aktivitet. | MUST |
| INT-APP-03 | Varje projekt SKALL ha en detaljvy med: ekonomi, tidslinje, foton, events, tilldelade personer. | MUST |
| INT-APP-04 | Användaren SKALL kunna skapa och redigera offerter i applikationen. | MUST |
| INT-APP-05 | Användaren SKALL kunna söka i hela sin verksamhet: projekt, kunder, personer, events. | MUST |
| INT-APP-06 | AI-assistenten SKALL vara tillgänglig i applikationen som en konversationsyta. | MUST |
| INT-APP-07 | Applikationen BOR fungera offline och synkronisera vid uppkoppling. | SHOULD |
| INT-APP-08 | Gränssnittet SKALL anpassas efter roll: ägare ser ekonomi, fältarbetare ser arbetsordrar. | SHOULD |

### 5.3 Utsändningar (Broadcasts)

**Definition:** Systemet skickar information till tredje part (kunder, beställare, myndigheter) utan att de har ett konto.

| ID | Krav | Prioritet |
|----|------|-----------|
| INT-UTS-01 | Systemet SKALL kunna skicka genererade dokument (offert, faktura, rapport) via e-post. | MUST |
| INT-UTS-02 | Systemet SKALL kunna skicka korta statusmeddelanden via SMS. | MUST |
| INT-UTS-03 | Systemet SKALL kunna skicka dokument via WhatsApp. | MUST |
| INT-UTS-04 | Utsändningar SKALL vara möjliga utan att mottagaren har ett konto. | MUST |
| INT-UTS-05 | Varje utsändning SKALL loggas som ett event av typ `message`. | MUST |
| INT-UTS-06 | Automatiska utsändningar (dagliga statusrapporter) SKALL kunna konfigureras per projekt. | SHOULD |
| INT-UTS-07 | Mottagaren BOR kunna svara, och svaret loggas i systemet. | SHOULD |

---

## 6. AI-BETEENDE

### 6.1 Grundprinciper

| ID | Princip | Innebörd |
|----|---------|----------|
| AI-P-01 | **Transparens** | AI SKALL alltid visa varifrån information kommer. Aldrig påstå utan källa. |
| AI-P-02 | **Korrigerbarhet** | Varje AI-handling SKALL kunna ångras eller korrigeras av användaren. |
| AI-P-03 | **Modellagnostik** | Systemet SKALL kunna byta AI-modell utan att ändra affärslogik. Alla AI-anrop går via ett abstraktionslager. |
| AI-P-04 | **Modell-tiering** | Systemet SKALL använda kostnadseffektiv modell per uppgift: billig modell för klassificering, dyrare för komplex generering. |
| AI-P-05 | **Determinism för beräkningar** | AI SKALL ALDRIG utföra aritmetik direkt. Beräkningar (summor, marginaler, moms) SKALL alltid göras av deterministisk kod. |
| AI-P-06 | **Kontexthierarki** | AI-kontext byggs hierarkiskt: platform → tenant → projekt → detalj → historik. Varje nivå har en tokenbudget. |

### 6.2 AI-kapabiliteter

| ID | Kapabilitet | Input | Output | Prioritet |
|----|------------|-------|--------|-----------|
| AI-CAP-01 | **Meddelandeklassificering** | Inkommande meddelande | Intent (tidsrapport, statusfråga, nytt ärende, etc.) + extraherade parametrar | MUST |
| AI-CAP-02 | **Offertgenerering** | Projektbeskrivning, foton, produktkatalog, historik | Strukturerade offertrader med kvantiteter, á-priser | MUST |
| AI-CAP-03 | **Översättning** | Text + källspråk + målspråk + branschordlista | Översatt text anpassad för affärskontext | MUST |
| AI-CAP-04 | **Dokumentförståelse** | Foto/scan av följesedel/faktura | Strukturerad data: artiklar, kvantiteter, priser, datum | SHOULD |
| AI-CAP-05 | **Anomalidetektering** | Projektets events + historiska jämförelsedata | Insikt med specifik orsak + källdata | SHOULD |
| AI-CAP-06 | **Narrativ sammanfattning** | Projektets events för en period | Mänskligt läsbar sammanfattning ("Dag 3 av 5. Vardagsrum klart.") | MUST |
| AI-CAP-07 | **Kontextbyggare** | Tenant + fokal nod | Strukturerad kontext för AI (token-budgeterad) | MUST |
| AI-CAP-08 | **Frågabesvarande** | Användares fråga + kontext från databasen | Svar med källhänvisning till specifika events/noder | MUST |

### 6.3 AI-kontextprotokoll

```
Level 0 — Platform     (label + dict, cacheat, ~100 tokens)
  Alltid inkluderat. Definerar tillgängliga typer, enheter, valutor.

Level 1 — Tenant       (org-inställningar, bransch, ~50 tokens)
  Alltid inkluderat. Organisationens namn, bransch, region, valuta.

Level 2 — Projekt      (sammanfattning, ~200 tokens)
  Inkluderat vid projektrelaterade frågor.
  Innehåller: nod-data, ekonomisk sammanfattning, tilldelade personer,
  senaste statusändring.

Level 3 — Detalj       (alla events, on-demand, ~2000 tokens)
  Inkluderat vid detaljerade frågor.
  Innehåller: alla events för noden, foton (metadata), meddelanden.

Level 4 — Historik      (analytiska trender, on-demand, ~500 tokens)
  Inkluderat vid jämförelse- eller analysfrågor.
  Innehåller: liknande projekt, trender, benchmarks.
```

**Regler:**
- `R-AI-CTX-01`: Kontextbyggaren SKALL aldrig skicka mer data till AI-modellen än vad som behövs för den aktuella uppgiften.
- `R-AI-CTX-02`: Kontextbyggaren SKALL prioritera: fokal entitet → direkt relaterade → 2 hopp bort → sammanfattning.
- `R-AI-CTX-03`: Kontextbyggaren SKALL räkna tokens och stoppa vid budget.

### 6.4 AI-branschordlista

| ID | Krav | Prioritet |
|----|------|-----------|
| AI-DICT-01 | Systemet SKALL underhålla en branschordlista med facktermer per bransch (måleri, VVS, el, trädgård) och språk. | MUST |
| AI-DICT-02 | Ordlistan SKALL användas som kontext vid AI-översättning för att säkerställa korrekt terminologi. | MUST |
| AI-DICT-03 | Tenants BOR kunna lägga till egna termer i ordlistan. | SHOULD |

---

## 7. AFFÄRSREGLER

### 7.1 ROT & RUT

| ID | Regel | Specifikation |
|----|-------|---------------|
| BR-ROT-01 | ROT-avdrag beräknas som 30% av arbetskostnad (ej material). | `rot_deduction = labor_cost * 0.30` |
| BR-ROT-02 | Maxbelopp per person per år: 50 000 SEK (ROT + RUT sammanlagt). | Systemet SKALL spåra ackumulerat avdrag per kund. |
| BR-ROT-03 | RUT-avdrag beräknas som 50% av arbetskostnad. | `rut_deduction = labor_cost * 0.50` |
| BR-ROT-04 | Maxbelopp per person per år: 75 000 SEK (ROT + RUT sammanlagt). | RUT-max 75k, varav ROT-andelen max 50k. |
| BR-ROT-05 | Avdraget SKALL visas tydligt på offerten: total, arbetskostnad, avdrag, kundens kostnad. | |
| BR-ROT-06 | Reglerna BOR vara konfigurerbara per region (för framtida expansion till Norge, Finland, etc.). | |

### 7.2 Moms (VAT)

| ID | Regel | Specifikation |
|----|-------|---------------|
| BR-VAT-01 | Standard momssats Sverige: 25%. | |
| BR-VAT-02 | Reducerad sats: 12% (livsmedel, hotell, etc.) och 6% (böcker, kultur). | |
| BR-VAT-03 | Omvänd skattskyldighet (reverse charge) SKALL stödjas för B2B inom EU. | |
| BR-VAT-04 | Momssats BOR vara konfigurerbar per tenant/region. | |

### 7.3 Prismodell

| Tier | Pris | Begränsningar |
|------|------|---------------|
| Free | 0 kr/mån | 1 användare, max 5 aktiva projekt, grundläggande AI |
| Pro | 499 kr/mån | 5 användare, obegränsade projekt, full AI |
| Business | 1 499 kr/mån | 20 användare, UE-hantering, rapporter, integrationer |
| Enterprise | ~99 kr/användare/mån | Obegränsat, anpassning, SLA |

| ID | Regel | Specifikation |
|----|-------|---------------|
| BR-PRI-01 | Free-tier SKALL vara fullt funktionell (inte en demo). Begränsningar gäller volym, inte funktioner. | |
| BR-PRI-02 | Uppgradering SKALL kunna ske utan avbrott (self-service). | |
| BR-PRI-03 | Free-tier-användare SKALL kunna ta emot arbetsordrar och tidrapportera (UE-flödet). | |
| BR-PRI-04 | UE som bjuds in av en betalande kund SKALL kunna använda systemet gratis (utan att det räknas mot den betalande kundens användarlimit). | |

### 7.4 Dataägande och integritet

| ID | Regel | Specifikation |
|----|-------|---------------|
| BR-DATA-01 | Varje tenant äger sin data fullt ut. | |
| BR-DATA-02 | Data SKALL kunna exporteras i standardformat (JSON, CSV). | |
| BR-DATA-03 | Vid tenant-radering SKALL all data kryptodöljasi (crypto-shredding) — krypteringsnyckeln raderas, data blir oläsbar. | |
| BR-DATA-04 | Personuppgifter SKALL hanteras enligt GDPR: rättigheterna till åtkomst, rättelse, radering, och portabilitet SKALL stödjas. | |
| BR-DATA-05 | UE:s persondata i en huvudentreprenörs tenant SKALL hanteras med adekvat rättslig grund (berättigat intresse för avtalsrelation, INTE samtycke). | |

---

## 8. INTEGRATIONER

### 8.1 Obligatoriska integrationer (MUST)

| ID | System | Riktning | Syfte |
|----|--------|----------|-------|
| INT-01 | **Bokföringssystem** (Fortnox, Visma, etc.) | Dubbelriktad | Synka fakturor, betalningar, kundreskontra |
| INT-02 | **WhatsApp Business API** | Dubbelriktad | Meddelandekanal för UE och kunder |
| INT-03 | **SMS-gateway** | Dubbelriktad | Fallback meddelandekanal |
| INT-04 | **E-postleverantör** | Utgående + inkommande | Skicka dokument, ta emot svar |
| INT-05 | **Objektlagring** | Utgående | Lagra foton, dokument, PDF:er |
| INT-06 | **AI-modell-API** | Dubbelriktad | Alla AI-kapabiliteter |

### 8.2 Viktiga integrationer (SHOULD)

| ID | System | Riktning | Syfte |
|----|--------|----------|-------|
| INT-07 | **BankID** (Sverige) / eIDAS-signering | Dubbelriktad | Digital signering av offerter, avtal |
| INT-08 | **Skatteverket** (ROT/RUT-begäran) | Utgående | Automatiserad ROT/RUT-ansökan |
| INT-09 | **Kartjänst** | Utgående | Adresslookup, kartlänkar i arbetsordrar |
| INT-10 | **Peppol** (e-faktura) | Utgående | E-faktura till offentlig sektor |

### 8.3 Framtida integrationer (MAY)

| ID | System | Syfte |
|----|--------|-------|
| INT-11 | **Leverantörskataloger** (Ahlsell, Dahl, Colorama) | Realtidspriser, artikeldata |
| INT-12 | **ID06** (svensk byggnads-ID) | Verifiering av personal på arbetsplats |
| INT-13 | **Google Reviews** | Automatisk förfrågan om recension efter avslutat projekt |
| INT-14 | **Kalendersystem** | Tvåvägssynk av bokningar |

### 8.4 Integrationsprinciper

| ID | Princip |
|----|---------|
| INT-P-01 | Alla integrationer SKALL gå via ett abstraktionslager. Byte av leverantör (t.ex. SMS-gateway) SKALL inte kräva ändringar i affärslogik. |
| INT-P-02 | Varje integration SKALL ha en hälsokontroll och felhantering. Om integration misslyckas SKALL systemet köa meddelandet och försöka igen. |
| INT-P-03 | Integrationskonfiguration SKALL vara per tenant (t.ex. Kimmo kan använda Fortnox, annan tenant kan använda Visma). |
| INT-P-04 | Integrationshändelser SKALL loggas som events för spårbarhet. |

---

## 9. SKALNINGSKRAV

### 9.1 Kapacitetskrav

| Horisont | Organisationer | Användare | Events/dag | Totalt events |
|----------|---------------|-----------|-----------|---------------|
| År 1 | 50 | 500 | 5 000 | 2M |
| År 3 | 5 000 | 50 000 | 500 000 | 500M |
| År 5 | 100 000 | 2 000 000 | 10 000 000 | 10B |
| Dröm | 1 000 000+ | 20 000 000+ | 100 000 000+ | 100B+ |

### 9.2 Prestandakrav

| ID | Krav | Gränsvärde |
|----|------|-----------|
| PERF-01 | API-svarstid (p95) för läsningar | < 200 ms |
| PERF-02 | API-svarstid (p95) för skrivningar | < 500 ms |
| PERF-03 | AI-svarstid (meddelandeklassificering) | < 2 sekunder |
| PERF-04 | AI-svarstid (offertgenerering) | < 10 sekunder |
| PERF-05 | PDF-generering | < 3 sekunder |
| PERF-06 | End-to-end meddelandeflöde (WhatsApp in → AI → svar ut) | < 10 sekunder |
| PERF-07 | Dashboard-laddning | < 2 sekunder |
| PERF-08 | Sökresultat | < 500 ms |

### 9.3 Tillgänglighetskrav

| ID | Krav | Gränsvärde |
|----|------|-----------|
| AVAIL-01 | Systemupptid | 99.9% (max ~9h nertid per år) |
| AVAIL-02 | Meddelandekö vid driftstopp | Meddelanden SKALL köas och levereras vid återställning |
| AVAIL-03 | Backup | Daglig fullbackup, point-in-time recovery |
| AVAIL-04 | Datahållbarhet | Inga events ska kunna gå förlorade |

### 9.4 Skalningsstrategi (konceptuell)

```
Fas 1 (0-50 orgs):
  - Enkelinstans-databas
  - 16 hash-partitioner förberedda
  - Event-partitioner per kvartal
  - RLS per tenant

Fas 2 (50-5000 orgs):
  - Läsreplikor för analytics
  - In-memory cache för labels + dict
  - Connection pooling
  - Automatiserad event-partitionering

Fas 3 (5000-100k orgs):
  - Horisontell sharding (tenant_id som distribution key)
  - Hash-partitioner → shards (redan förberett)
  - Dedikerad analytics-instans

Fas 4 (100k+ orgs):
  - Multi-region deployment
  - tenant.region styr dataresidency
  - Federation-layer för cross-region queries
  - Labels + dict synkas globalt
```

---

## 10. SÄKERHET & EFTERLEVNAD

### 10.1 Autentisering & Auktorisering

| ID | Krav | Prioritet |
|----|------|-----------|
| SEC-01 | Systemet SKALL stödja autentisering via e-post + lösenord samt social login. | MUST |
| SEC-02 | Systemet BOR stödja BankID som autentiseringsmetod (Sverige). | SHOULD |
| SEC-03 | Alla API-anrop SKALL autentiseras med JWT eller likvärdig tokenmekanism. | MUST |
| SEC-04 | JWT SKALL innehålla tenant_id för att möjliggöra RLS utan extra databassökningar. | MUST |
| SEC-05 | Systemet SKALL stödja rollbaserad åtkomstkontroll (RBAC): Ägare, Admin, Medlem, UE, Kund. | MUST |
| SEC-06 | Varje databasfråga SKALL filtreras på tenant_id (Row Level Security). | MUST |

### 10.2 Dataskydd

| ID | Krav | Prioritet |
|----|------|-----------|
| SEC-10 | All data i transit SKALL vara krypterad (TLS 1.2+). | MUST |
| SEC-11 | All data at rest SKALL vara krypterad. | MUST |
| SEC-12 | Personuppgifter SKALL kunna raderas per individ (GDPR right to erasure) via crypto-shredding. | MUST |
| SEC-13 | Systemet SKALL logga alla åtkomster till personuppgifter (audit trail). | MUST |
| SEC-14 | Bilagor/blobs SKALL nås via tidsbegränsade signerade URL:er. | MUST |

### 10.3 GDPR-efterlevnad

| ID | Krav | Prioritet |
|----|------|-----------|
| GDPR-01 | Systemet SKALL stödja Data Processing Agreement (DPA) med varje tenant. | MUST |
| GDPR-02 | Systemet SKALL stödja dataexport per individ (rätt till åtkomst). | MUST |
| GDPR-03 | Systemet SKALL stödja rätt till rättelse. | MUST |
| GDPR-04 | Systemet SKALL stödja rätt till radering (via crypto-shredding för events, faktisk radering för noder). | MUST |
| GDPR-05 | Systemet SKALL stödja rätt till dataportabilitet (export i maskinläsbart format). | MUST |
| GDPR-06 | Systemet SKALL ha en Record of Processing Activities (ROPA). | MUST |
| GDPR-07 | Dataincidentrapportering SKALL kunna ske inom 72 timmar. | MUST |

---

## 11. MÄTVÄRDEN & FRAMGÅNGSKRITERIER

### 11.1 Produktmätvärden

| Mätvärde | Mål (År 1) | Mål (År 3) |
|----------|-----------|-----------|
| Registrerade tenants | 50 | 5 000 |
| DAU (Daily Active Users) | 200 | 20 000 |
| Events/dag | 5 000 | 500 000 |
| Offert → Signerad konvertering | > 30% | > 40% |
| Free → Pro konvertering | > 3% | > 5% |
| UE → Egen kund (nätverkseffekt) | > 5% per år | > 10% per år |
| NPS | > 40 | > 60 |
| Genomsnittlig tid: offert till signering | < 30 min | < 15 min |
| Churn (Pro/Business) | < 5% / mån | < 3% / mån |

### 11.2 Tekniska mätvärden

| Mätvärde | Gränsvärde |
|----------|-----------|
| API p95 latency | < 200 ms |
| Felfrekvens (5xx) | < 0.1% |
| AI-klassificeringskorrekthet | > 90% |
| WhatsApp-leveransfrekvens | > 98% |
| Systemupptid | > 99.9% |

### 11.3 North Star Metric

> **Antal framgångsrikt levererade AI-insikter per dag som leder till en användaråtgärd.**

Denna metrik fångar kärnan: systemet levererar rätt information, till rätt person, i rätt ögonblick, och personen agerar på den. Det är skillnaden mellan ett system som visar data och ett system som gör data handlingsbar.

---

## 12. ORDLISTA

| Term | Definition |
|------|-----------|
| **Tenant** | En organisation som använder plattformen. Fysisk isoleringsenhet. |
| **Node** | En entitet: person, projekt, kund, leverantör, produkt, plats. |
| **Edge** | En relation mellan två noder inom samma tenant. |
| **Federation Edge** | En relation mellan noder i olika tenants (consent-baserad). |
| **Event** | En händelse: tidsregistrering, material, foto, meddelande, fakturerad. Append-only. |
| **Label** | En typad etikett som klassificerar noder, kanter, events. Systemets typsystem. |
| **Blob** | Metadata om binärt innehåll (fil lagras externt). |
| **Dict** | Översättningar, konfiguration, semantisk data. |
| **UE** | Underentreprenör (subcontractor). |
| **ROT** | Renovering, Ombyggnad, Tillbyggnad — 30% skatteavdrag på arbetskostnad i Sverige. |
| **RUT** | Rengöring, Underhåll, Tvätt — 50% skatteavdrag på arbetskostnad i Sverige. |
| **Utsändning** | Ett dokument eller meddelande skickat till tredje part utan att de har konto. |
| **AI-kontext** | Strukturerad data som skickas till AI-modellen för att ge den förståelse om verksamheten. |
| **Crypto-shredding** | Radering genom att förstöra krypteringsnyckeln istället för att radera data fysiskt. |
| **Compensating event** | Ett event som korrigerar ett tidigare event (istället för att ändra det). |

---

## 13. AVGRÄNSNINGAR (Vad Resonansia INTE är)

| # | Avgränsning |
|---|-------------|
| 1 | Resonansia är INTE ett bokföringssystem. Det integrerar med bokföringssystem (Fortnox, Visma). |
| 2 | Resonansia är INTE en marknadsplats (kund hittar hantverkare). Det är ett verktyg FÖR hantverkaren. |
| 3 | Resonansia fattar INTE beslut åt användaren. AI föreslår, människan beslutar. |
| 4 | Resonansia ersätter INTE branschspecifik certifiering eller regelverkshantering. |
| 5 | Resonansia hanterar INTE löner. Det registrerar tid som kan exporteras till lönesystem. |
| 6 | Resonansia lagrar INTE betalningsinformation (kreditkort, bankuppgifter). Betalning sker via integration. |

---

## 14. BILAGOR

### Bilaga A: Tekniska rekommendationer (ej bindande)

Dessa rekommendationer baseras på research men är INTE bindande. Implementeringsteamet väljer teknik.

| Område | Rekommendation | Motivering |
|--------|---------------|------------|
| Identifierare | UUID v7 (RFC 9562) framför ULID | Standardiserat, bättre ekosystemstöd, samma fördelar |
| Databasdesign | Hash-partitionering by tenant_id (16 partitioner) | Förbereder för horisontell sharding utan kodändringar |
| Event-partitionering | Kvartalsvisa sub-partitioner på tidsstämpel | Möjliggör effektiv arkivering och partition pruning |
| AI-routing | Billig modell för klassificering, dyr modell för generering | Håller AI-kostnaden under 30 kr/tenant/mån |
| Cache | Labels + Dict i minnet med NOTIFY-invalidering | Dessa tabeller läses tusentals gånger per sekund |
| GDPR-radering | Crypto-shredding för append-only events | Kompatibelt med event-immutabilitet |
| Analytik | Materialiserade vyer eller separat analytik-instans | Undviker att analytikfrågor belastar operativ databas |
| WhatsApp vs SMS | WhatsApp som primär kanal, SMS som fallback | WhatsApp: billigare, rikare funktionalitet, 80%+ penetration i Europa |

### Bilaga B: Marknadskontext

| Datapunkt | Värde | Källa |
|-----------|-------|-------|
| Hantverksföretag i Sverige | ~90 000–110 000 | SCB |
| Hantverksföretag i Europa | ~3,2 miljoner | Eurostat, EBC |
| Andel med < 10 anställda | ~90–95% | Eurostat |
| ROT-marknadens totalvärde | ~100–150 miljarder SEK/år | Skatteverket |
| Digital mognad (andel med dedikerad mjukvara, < 10 anst.) | ~15–30% | Byggföretagen |
| WhatsApp-penetration i Sverige | ~55–65% (90%+ bland utrikesfödda) | DataReportal |
| Fortnox kundbas | ~500 000+ | Fortnox IR |
| ServiceTitan-värdering | ~$9,5 miljarder (IPO dec 2024) | NASDAQ |
| Bygglet kundbas | ~15 000 | Bygglet |
| AI-kostnad per interaktion (billig modell) | ~$0.0001–0.001 | OpenAI/Anthropic |
| AI-kostnad per interaktion (avancerad modell) | ~$0.002–0.02 | OpenAI/Anthropic |
| Driftkostnad per tenant vid skala | ~5 kr/mån | Uppskattning |

### Bilaga C: Risk- och mitigeringsmatris

| Risk | Sannolikhet | Konsekvens | Mitigering |
|------|------------|------------|------------|
| Hantverkare antar inte digital verksamhetsstyrning | Medel | Hög | WhatsApp/SMS som gränssnitt — ingen ny app att lära sig |
| AI-hallucineringar i ekonomiska beräkningar | Låg | Mycket hög | AI gör aldrig aritmetik. Deterministisk kod beräknar. AI föreslår, människa bekräftar. |
| Konkurrent kopierar AI-first-ansatsen | Medel | Medel | Nätverkseffekt (UE-flödet) skapar moat. Data-gravity ökar med tid. |
| GDPR-incident | Låg | Mycket hög | Tenant-isolering, crypto-shredding, audit logging, DPA från dag 1 |
| WhatsApp Business API-förändringar (Meta-beroende) | Medel | Medel | SMS som fallback. Abstrakt meddelandelager. |
| Skalningsproblem vid snabb tillväxt | Låg | Hög | Partitionering förberedd dag 1. Migreringsväg till horisontell sharding definierad. |
| Felaktig ROT/RUT-beräkning | Låg | Hög | Regler konfigurerbara per region. Automatiserade tester mot Skatteverkets regler. |

---

*Denna spec definierar VAD Resonansia är. Nästa steg är att välja teknologier och bygga.*

*"Den bästa infrastrukturen är den som ingen märker att de använder — tills de försöker klara sig utan."*