# Högskolekompassen v0.6.5

Fixar kopplingen mellan EMIL3 EducationEvent och EducationInfo.

I EMIL3 ligger referensen i `content.education`. v0.6.4 slog upp den från fel plats innan matchningen. Därför importerades alla events men `linked` blev 0.

## Uppgradering från v0.6.4

Behåll din befintliga `db/hogskolekompassen.sqlite` och ersätt källfilerna med v0.6.5.

Kör sedan:

```powershell
npm install
npm run db:migrate:v06
npm run susa:relink
npm run susa:status
npm run dev
```

`npm run susa:relink` använder de redan importerade EducationInfo- och EducationEvent-posterna och behöver inte hämta ~59 000 events igen.
