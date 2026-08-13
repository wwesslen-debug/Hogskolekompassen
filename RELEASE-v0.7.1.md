# Högskolekompassen v0.7.1 — Live Matching & Safe Sync

Robusthetsversion ovanpå v0.7.0.

## Varför versionen finns

I v0.7.0 hämtades hela Susa-katalogen till minnet och hela SQLite-skrivningen låg bakom en stor transaktion. Om processen avbröts efter att cirka 59 000 EducationInfo och 59 000 EducationEvent redan hade hämtats kunde databasen därför fortfarande vara tom.

## Förbättringar

- Fullsynken checkpointar varje lyckad API-sida till `db/.susa-sync-cache`.
- En avbruten fullsynk kan återupptas från senaste checkpoint i upp till sex timmar.
- HTTP 429, 502, 503 och 504 samt tillfälliga nätverksfel får upp till åtta försök med exponential backoff.
- Providers, EducationInfo och EducationEvent sparas i mindre SQLite-transaktioner med progressutskrift.
- Canonical-matchning har flyttats ur importfasen; Susa-datan sparas först och länkas sedan av `susa:relink`.
- Relink visar två analyssteg samt skrivprogress och commit:ar i mindre batcher.
- `npm run susa:sync:full` gör fortfarande hela flödet automatiskt: sync → relink.
- Nytt `npm run susa:sync:full:fresh` ignorerar/rensar checkpoint om man verkligen vill börja om från sida 1.
