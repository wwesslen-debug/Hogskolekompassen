# Release v0.7.0

## Live Matching & Better Linking

- Ny tvåpass-länkare med titel, tags, examen, utbildningstyp, beskrivning och SUN-stöd.
- SUN-koder lärs konservativt från högsäkerhetsmatchningar och används bara som stödsignal.
- Resultatsidan visar verkliga aktuella Susa-nav-utbildningstillfällen för användarens topprofiler.
- Personlig matchprocent och länksäkerhet visas separat.
- Ny `/datakvalitet` med täckning, confidence buckets, länkmetoder och förbättringskö.
- Nytt `npm run susa:quality`.
- `npm run susa:sync:full` kör automatiskt relink efter fullsynk.
- Nytt `npm run susa:update` för delta-synk + relink.
- Ny canonical-profil för Polisutbildningen.
- 370 canonical-profiler totalt.
- Resultatschema uppdaterat till version 7, men v0.6-resultat i sessionen kan fortfarande läsas.
