# Uppdatera Högskolekompassen v0.5 → v0.6

## 1. Stoppa servern

I terminalen där Next.js körs:

```powershell
Ctrl+C
```

## 2. Kopiera uppdateringspaketet

Packa upp `hogskolekompassen-v0.6-update.zip` och kopiera innehållet direkt till projektmappen:

```text
C:\Users\willi\Downloads\hogskolekompassen-nextjs\hogskolekompassen-next
```

Välj **Ersätt filer**.

## 3. Migrera databasen

```powershell
npm run db:migrate:v06
```

Kommandot kan köras flera gånger. Det skapar bara de live-tabeller som saknas.

## 4. Testa API-kopplingen

```powershell
npm run susa:probe
```

Detta skriver inte till databasen. Om skolformsfiltret inte fungerar i den aktuella API-versionen kan du även testa:

```powershell
npm run susa:probe -- --no-school-type
```

## 5. Kör första fullsynken

```powershell
npm run susa:sync -- --full
```

Kontrollera sedan:

```powershell
npm run susa:status
```

## 6. Starta appen

```powershell
npm run dev
```

Öppna:

```text
http://localhost:3000/aktuellt
```

## Därefter

För löpande uppdateringar behöver du normalt bara köra:

```powershell
npm run susa:sync
```

v0.6 använder `schemaVersion: 6` för kompassresultat. Gör därför kompassen på nytt efter uppdateringen om du har ett äldre v0.5-resultat kvar i sessionen.
