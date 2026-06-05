# Krakow Parking System

System zarządzania miejscami parkingowymi dla Krakowa. Obejmuje REST API Spring Boot, panel administratora React, aplikację użytkownika React, aplikację inspektora, PostGIS, Redis i reverse proxy Nginx.

## Wymagania

- Docker i Docker Compose

## Szybki start

```bash
cp .env.example .env
docker-compose up --build
```

## URL-e po uruchomieniu

| Serwis | URL |
|---|---|
| Aplikacja użytkownika | http://localhost:80 |
| Panel admina | http://localhost:80/admin |
| Panel inspektora | http://localhost:80/inspektor/ |
| Swagger UI | http://localhost:80/swagger-ui.html |
| Backend API | http://localhost:8080 |
| User frontend (dev) | http://localhost:3000 |
| Admin frontend (dev) | http://localhost:3001 |

## Konta testowe

| Rola | Email | Hasło |
|---|---|---|
| Administrator | admin@krakow-parking.local | Admin123! |
| Użytkownik | user@krakow-parking.local | User12345! |
| Właściciel parkingu | owner@krakow-parking.local | Owner123! |

## Role użytkowników

- **ADMIN** — pełny dostęp do panelu administracyjnego: zarządzanie parkingami, cenniki, reguły SCT, użytkownicy, raporty, panel IoT.
- **PARKING_OWNER** — dostęp do `/api/owner/parking-lots`: edycja przypisanych parkingów, aktualizacja obłożenia i konfiguracji miejsc. Rolę nadaje wyłącznie administrator.
- **USER** — dostęp do własnego profilu, pojazdów, rezerwacji, sesji parkingowych i publicznych endpointów wyszukiwania.

---

## Funkcje

### Uwierzytelnianie i autoryzacja

- Rejestracja z walidacją formatu e-mail i siły hasła
- Logowanie (HTTP Basic Auth, token Base64 w nagłówku `Authorization`)
- Hashowanie haseł BCrypt
- Zmiana hasła z walidacją (stare hasło + potwierdzenie nowego)
- Role: ADMIN, PARKING_OWNER, USER — użytkownik może mieć wiele ról jednocześnie
- Blokowanie i usuwanie kont przez administratora

### Zarządzanie parkingami

- CRUD parkingów przez administratora i właściciela
- Statusy: `ACTIVE`, `INACTIVE`, `TEMPORARILY_CLOSED`, `PENDING_APPROVAL`
- Nowe parkingi tworzone przez właścicieli wymagają zatwierdzenia przez admina
- **Typ dostępu:**
  - `BARRIER` — parking z szlabanem; obsługuje rezerwacje i wjazd bez rezerwacji (kamera)
  - `OPEN` — parking otwarty bez szlabanu; płatność po wjeździe, bez rezerwacji
- Strefy cenowe: `ZONE_A`, `ZONE_B`, `ZONE_C`
- Typy parkingu: `PUBLIC`, `PRIVATE`, `UNDERGROUND`, `PARK_AND_RIDE`
- Konfiguracja kategorii miejsc: `REGULAR`, `EV`, `DISABLED`, `SCT_READY`
- Przypisanie właściciela przez administratora

### Cenniki

- Cennik strefowy (ZONE_A / B / C)
- Indywidualny cennik parkingu (nadpisuje strefowy)
- Stawki: 1. godzina, 2. godzina, 3. godzina, kolejne godziny, cena dobowa
- Kalkulacja kosztu z rozbiciem i automatycznym wyborem tańszego trybu (godzinowy vs dobowy)
- Czas pobytu zawsze zaokrąglany w górę do pełnych godzin

### Strefa Czystego Transportu (SCT)

- Reguły wjazdu według rodzaju paliwa i normy emisji spalin
- Wynik weryfikacji: `ALL_SPOTS`, `SCT_SPOTS_ONLY`, `NOT_ALLOWED`
- Weryfikacja pojazdu przed wyświetleniem dostępności w wyszukiwarce

### Profil użytkownika

- Edycja danych konta (imię, nazwisko, numer telefonu)
- Zarządzanie wieloma pojazdami (dodawanie, edycja, usuwanie)
- Wybór aktywnego pojazdu — automatycznie uwzględniany przy wyszukiwaniu

### Wyszukiwanie parkingów

- Filtrowanie po lokalizacji GPS (promień w km), nazwie, strefie, dostępności, godzinach otwarcia
- Sortowanie: odległość, cena, liczba wolnych miejsc
- Przewidywany koszt postoju przy zadanym czasie parkowania
- Wyświetlanie typu dostępu (szlaban / otwarty)
- Uwzględnienie przepustek SCT użytkownika

### Rezerwacje (tylko parkingi BARRIER)

- Tworzenie rezerwacji z wyborem daty i godziny (od–do)
- Rezerwacja parkingu OPEN jest zablokowana (brak szlabanu — nie ma potrzeby)
- Statusy rezerwacji: `PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `EXPIRED`
- Rezerwacja aktywowana dopiero po opłaceniu
- Blokada wjazdu gdy parking pełny

### Sesje parkingowe (wjazd bez rezerwacji)

#### Parking z szlabanem (BARRIER)

1. Kamera wjazdowa rejestruje tablicę i czas wjazdu → sesja `ACTIVE`
2. Przy wyjeździe kamera/inspektor inicjuje płatność → kwota liczona od czasu wjazdu (ceil do pełnych godzin) → `PAYMENT_PENDING`
3. Kierowca płaci kartą → sesja `PAID` → szlaban otwiera się

#### Parking otwarty (OPEN)

1. Kierowca wpisuje tablicę i **planowaną godzinę wyjazdu** (godz. od ustawiana automatycznie)
2. System oblicza koszt z góry: `ceil((godz_do − godz_od) / 60 min)` pełnych godzin × stawka
3. Kierowca płaci od razu → sesja `PAID` z terminem ważności
4. Inspektor sprawdza tablicę → widzi czy sesja PAID jest wciąż ważna (godz_do ≥ teraz)

Statusy sesji: `ACTIVE`, `PAYMENT_PENDING`, `PAID`, `CANCELLED`

### Płatności

- Symulacja płatności kartą (środowisko testowe, karta `4242 4242 4242 4242`)
- Opcjonalna integracja z bramką **Paynow** (sandbox):
  - Wymagane zmienne środowiskowe: `PAYNOW_API_KEY`, `PAYNOW_SIGNATURE_KEY`
  - Podpisywanie żądań HMAC-SHA256
  - Gdy klucze nie są skonfigurowane — fallback do lokalnej symulacji

### Panel inspektora (`/inspektor/`)

Samodzielna aplikacja webowa (bez frameworka, czysty HTML+JS) przeznaczona dla inspektorów i urządzeń bramkowych:

- **Zakładka „Sprawdź tablicę"** — wprowadź numer rejestracyjny → wynik:
  - ✓ OPŁACONY — aktywna płatna sesja lub potwierdzona rezerwacja
  - ⚠ CZAS MINĄŁ — sesja OPEN z przekroczonym terminem ważności
  - ⚠ OCZEKUJE NA PŁATNOŚĆ — sesja zainicjowana, niezapłacona
  - ✗ BRAK OPŁATY — brak jakiejkolwiek aktywnej sesji/rezerwacji
- **Zakładka „Opłata przy wyjściu"** — dla parkingów BARRIER:
  - Podaj tablicę → system oblicza kwotę → formularz karty → szlaban otwiera się

### Powiadomienia w aplikacji

- Powiadomienia o kończącej się rezerwacji (15 minut przed końcem)
- Powiadomienie o wygaśnięciu rezerwacji
- Powiadomienie o potwierdzeniu rezerwacji po opłaceniu
- Wyświetlane w aplikacji użytkownika z licznikiem nieprzeczytanych

### Panel administratora

- Zarządzanie wszystkimi parkingami (CRUD, zatwierdzanie wniosków)
- Zarządzanie cenami strefowymi i indywidualnymi
- Zarządzanie użytkownikami i rolami
- Zarządzanie regułami SCT
- Raporty obłożenia parkingów (bieżące i historyczne)
- **Panel IoT** — symulacja kamer:
  - Kamera wjazdowa: wybór parkingu + tablica → rejestracja wjazdu
  - Kamera wyjazdowa/kontrolna: sprawdzenie tablicy (status opłaty)

### Panel właściciela parkingu (w aplikacji użytkownika)

- Podgląd przypisanych parkingów
- Aktualizacja obłożenia miejsc
- Zarządzanie kategoriami miejsc i cennikiem
- Dodawanie nowych parkingów (wymagają zatwierdzenia przez admina)

---

## Struktura katalogów

```
backend/              Spring Boot API, migracje Flyway (V1–V20), testy
admin-frontend/       Panel administratora React + TypeScript
user-frontend/        Aplikacja użytkownika React + TypeScript
inspector-frontend/   Panel inspektora (standalone HTML)
nginx/                Konfiguracja reverse proxy
docs/                 Przykładowe requesty HTTP
```

## Decyzje architektoniczne

- **Auth: HTTP Basic + token Base64** — stateless uwierzytelnianie; token to `Base64(email:password)` w nagłówku `Authorization: Basic <token>`.
- **Baza: PostgreSQL + PostGIS** — zapytania przestrzenne (`ST_DWithin`) do wyszukiwania parkingów w zadanym promieniu.
- **Migracje: Flyway** — wersjonowane migracje SQL V1–V20.
- **Walidacja: Bean Validation + DB constraints** — adnotacje na DTO + constrainty `CHECK` w bazie danych.
- **Płatności: opcjonalny Paynow** — gdy klucze API nie są ustawione, system automatycznie używa lokalnej symulacji karty.

## Komendy deweloperskie

```bash
# Backend — build i testy
cd backend
./gradlew build
./gradlew test

# User frontend
cd user-frontend
npm install
npm run dev

# Admin frontend
cd admin-frontend
npm install
npm run dev
```

## Seed data

Backend przy pierwszym uruchomieniu zasila bazę:

- **Konta:** ADMIN, USER, PARKING_OWNER (owner@krakow-parking.local / Owner123!)
- **Parkingi:**
  - BARRIER: Bonarka City Center, Galeria Kazimierz, Rynek Główny (prywatne/podziemne)
  - OPEN: Galeria Krakowska, P+R Czerwone Maki, P+R Bieżanów, Wawel, ICE Kraków (publiczne/park&ride)
- **Cenniki** dla stref A, B, C i indywidualny dla wybranych parkingów
- **Pojazdy testowe** przypisane do konta użytkownika
- **Reguły SCT** dla stref A, B i C

## Zmienne środowiskowe (opcjonalne)

| Zmienna | Opis | Domyślnie |
|---|---|---|
| `PAYNOW_API_KEY` | Klucz API bramki Paynow (sandbox) | — (wyłączone) |
| `PAYNOW_SIGNATURE_KEY` | Klucz podpisu HMAC Paynow | — (wyłączone) |
| `PAYNOW_CONTINUE_URL` | URL powrotu po płatności | `http://localhost:3000/rezerwacje` |
