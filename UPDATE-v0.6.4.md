# v0.6.4 – HS Live Education

Den här versionen gör den verifierade skolformskoden `HS` till standard för Högskolekompassen.

## Ändrat

- `SUSA_SCHOOL_TYPE` standard: `HS`.
- `npm run susa:probe` provar nu högskoledata direkt.
- Nytt kommando: `npm run susa:sync:full`.
- Standardgränsen för paginering höjd till 1000 sidor per collection.
- EMIL3 `configuration.code` används för program/kurs.
- `degrees` normaliseras till examen.
- `eligibleForStudentAid` normaliseras.
- `paceOfStudy.percentage` visas som procent.
- Otydliga numeriska `execution.condition.code` visas inte längre som studieform.
- Fullsynk reconciliar stale events, infos och providers.
- Livekatalogen filtrerar defensivt till `HS` även vid läsning.
- Migreringen kan lägga till `degree` och `student_aid` i en befintlig v0.6-databas.

## Rekommenderad första körning

```powershell
npm install
npm run db:migrate:v06
npm run susa:probe
npm run susa:sync:full
npm run susa:status
npm run dev
```
