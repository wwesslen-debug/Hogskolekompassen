# Högskolekompassen v0.3 – större utbildningskatalog

Den här versionen utökar katalogen från 48 till 369 utbildningsposter över 19 områden.

## Nytt

- 321 nya generiska utbildningsinriktningar
- bioteknik, biokemi, molekylärbiologi och flera närliggande civilingenjörsspår
- betydligt fler teknik-, IT-, naturvetenskaps-, ekonomi-, vård-, juridik-, samhälls-, design-, språk-, lärar-, miljö-, lantbruks-, musik-, idrotts-, säkerhets- och transportutbildningar
- matchnings-API:t använder nu hela katalogen i stället för max 100 poster
- utbildningssökningen kan visa upp till 500 träffar
- nytt filter för examen
- sökningen delar upp flera sökord, så `civilingenjör biokemi` kan hitta en utbildning där orden finns i olika fält
- startsidan visar aktuellt antal poster direkt från databasen

## Uppdatera ett befintligt lokalt projekt

1. Stoppa dev-servern med `Ctrl+C`.
2. Kopiera filerna från uppdateringspaketet till projektroten och ersätt befintliga filer.
3. Starta igen:

```powershell
npm run dev
```

Databasen i uppdateringspaketet är redan seedad. Om du senare ändrar `data/programs.json` själv kan du köra:

```powershell
npm run db:seed
```

## Viktigt

Poster märkta `Flera lärosäten / Flera orter` är utbildningsinriktningar som används för bredare matchning. Aktuellt utbildningsutbud, studieort och behörighet ska verifieras på Antagning.se.
