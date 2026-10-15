# Plany & Diety 💪

Aplikacja dla trenera personalnego do tworzenia **planów treningowych** i **diet** dla podopiecznych.

## Co potrafi

- **Podopieczni** – dane (płeć, wiek, wzrost, waga, aktywność, cel, notatki) i automatyczne
  wyliczenie zapotrzebowania kalorycznego (BMR, TDEE, cel kcal, proponowane makro).
- **Generator planów treningowych** – wpisujesz założenia (cel, poziom, dni w tygodniu, czas, sprzęt,
  kontuzje, partie priorytetowe), a aplikacja układa plan (FBW / Góra-Dół / PPL) z seriami, powtórzeniami
  i przerwami. Każde ćwiczenie podmienisz jednym kliknięciem (⇄) na podobne.
- **Generator diet** – wpisujesz kcal i makro, liczbę posiłków i preferencje (wege, bez laktozy, bez glutenu),
  a aplikacja dobiera przepisy i przelicza gramatury tak, żeby trafić w cel.
- **Przepisy** – baza 40 przepisów + własne przepisy.
- **PDF** – czytelny wydruk planu i diety do wysłania podopiecznemu („Podgląd / PDF” → „Zapisz jako PDF”).
- **Biblioteka** – własne ćwiczenia i produkty (wartości na 100 g).
- **Kopia zapasowa** – eksport / import wszystkich danych do pliku.

> ⚠️ Dane są zapisywane w przeglądarce na danym urządzeniu. Regularnie pobieraj kopię zapasową!

## Uruchomienie na komputerze

Potrzebny jest [Node.js](https://nodejs.org) (wersja 20 lub nowsza).

```bash
npm install     # jednorazowo – instaluje biblioteki
npm run dev     # uruchamia aplikację, adres pojawi się w terminalu (zwykle http://localhost:5173)
```

## Publikacja w internecie (GitHub Pages)

1. W repozytorium na GitHubie: **Settings → Pages → Source: GitHub Actions**.
2. Każda zmiana wypchnięta na gałąź `main` automatycznie publikuje aplikację pod adresem
   `https://rpz62tcdr6-hash.github.io/plany-dieta/`.

## Struktura projektu

| Plik / folder          | Co zawiera                                             |
| ---------------------- | ------------------------------------------------------ |
| `src/types.ts`         | opis danych (podopieczny, plan, dieta…)                |
| `src/calc.ts`          | obliczenia: BMR, TDEE, makroskładniki                  |
| `src/store.tsx`        | zapisywanie danych w przeglądarce                      |
| `src/data/`            | startowa baza ćwiczeń, produktów i przepisów           |
| `src/generators/`      | generator planów treningowych i diet                   |
| `src/views/`           | ekrany aplikacji                                       |
| `src/components/`      | mniejsze elementy wielokrotnego użytku                 |
| `src/index.css`        | wygląd                                                 |
