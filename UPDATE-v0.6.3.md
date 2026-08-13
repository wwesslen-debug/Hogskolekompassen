# Högskolekompassen v0.6.3

Den här versionen bygger på den live-probe som kördes mot Skolverkets Susa-nav den 9 augusti 2026.

## Viktigaste ändringen

EMIL3-listposter returneras som ett wrapperobjekt:

```json
{
  "id": "...",
  "status": "ACTIVE",
  "content": { "...": "..." }
}
```

v0.6.2 läste flera egenskaper direkt från wrappern. v0.6.3 läser först `content` och bevarar samtidigt `id`/`status` från wrappern.

Utbildningsformen hämtas från `EducationInfo.content.type.code`. I det verifierade provsvaret gav Arbetsförmedlingens utbildning koden `AUB`.

## Nytt kommando

```powershell
npm run susa:types
```

Det går igenom `educationInfos` utan databas-skrivningar och sammanställer observerade `C_SchoolType`-koder. Använd detta för att identifiera universitet/högskola innan full synk.

## Säkrare full synk

v0.6.3 kräver antingen:

```powershell
npm run susa:sync -- --full --school-type <CODE>
```

eller det uttryckliga felsökningsvalet `--keep-unfiltered`. Detta förhindrar att hela Susa-navets utbildningssystem importeras av misstag.
