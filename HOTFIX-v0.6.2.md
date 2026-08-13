# Högskolekompassen v0.6.2 hotfix

Fixar slutvillkoret i Susa-navets paginering efter live-test mot EMIL3.

## Vad loggen visade
- API:t levererade 7 215 unika `educationProviders`.
- Sida 73 innehöll de sista 15 posterna.
- Därefter fortsatte API:t exponera en stale/repeated `next`-länk, vilket gjorde att v0.6.1 tillverkade tomma sidnummer fram till `--max-pages=500`.

## Ändringar
- Stoppar direkt på tom sida.
- Stoppar om en sida inte innehåller några nya poster.
- Stoppar på en kort slutsida om `next` pekar på en redan besökt sida.
- Deduplikerar poster under paginering.
- `susa:probe` hämtar nu bara 2 sidor per endpoint som standard i stället för hela datamängden.
- `susa:probe` skriver ut observerade `schoolType`-värden så att rätt högskolefilter kan sättas utan gissning.
- Det tidigare gissade standardfiltret `UH` är borttaget. Full sync hämtar ofiltrerat tills korrekt kod har verifierats och filtrerar sedan lokalt.

## Installation
Kopiera innehållet i zip-filen över projektroten och välj Ersätt filer.

Kör sedan:

```powershell
npm run susa:probe
```

För ett större schema-prov:

```powershell
npm run susa:probe -- --probe-pages 5
```

När proben ser rimlig ut:

```powershell
npm run susa:sync -- --full
npm run susa:status
```
