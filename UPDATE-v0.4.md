# Uppdatera Högskolekompassen v0.3 → v0.4

1. Stoppa dev-servern med `Ctrl+C`.
2. Kopiera innehållet i v0.4-uppdateringspaketet direkt över din befintliga projektmapp `hogskolekompassen-next`.
3. Välj **Ersätt filer** när Windows frågar.
4. Starta igen:

```powershell
npm run dev
```

Inga nya npm-paket har lagts till, så `npm install` behöver normalt inte köras igen.

Databasen i `db/hogskolekompassen.sqlite` är redan uppdaterad till det nya frågeschemat med 50 frågor och 17 dimensioner.

Om du själv ändrar JSON-datan senare kan du köra:

```powershell
npm run db:seed
npm run validate
```

Efter uppdateringen bör du göra kompassen på nytt. Resultat från v0.3 i webbläsarens session används inte av v0.4 eftersom matchningsmodellen har ändrats.
