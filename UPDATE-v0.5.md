# Uppdatera Högskolekompassen v0.4 → v0.5

1. Stoppa dev-servern med `Ctrl+C`.
2. Packa upp `hogskolekompassen-v0.5-update.zip`.
3. Kopiera innehållet i mappen **hogskolekompassen-next** över din befintliga projektmapp och välj **Ersätt filer**.
4. Starta igen:

```powershell
npm run dev
```

Inga nya npm-dependencies har lagts till, så `npm install` behöver normalt inte köras igen.

## Nytt

- fyra delpoäng per matchning
- upp till fem adaptiva följdfrågor
- sex valfria deal-breakers
- transparent förklaring av vad som drog matchningen upp/ner
- `/min-vag` för sparade utbildningar
- smartare `/jamfor`
- `/karriar` för karriärspår
- nytt API `/api/refine`

## Viktigt

v0.5 använder `schemaVersion: 5`. Gör därför kompassen på nytt efter uppdateringen; gamla v0.4-resultat i `sessionStorage` används inte av den nya resultatsidan.

Sparade utbildningar i **Min väg** lagras i `localStorage` och kräver inget konto i den här prototypen.
