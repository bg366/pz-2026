# Krakow Parking System

System zarządzania miejscami parkingowymi dla Krakowa. REST API Spring Boot, panel administratora React, aplikacja użytkownika React, aplikacja inspektora, PostGIS, Redis, Nginx.

## Wymagania

- Docker i Docker Compose

## Szybki start

```bash
cp .env.example .env
# Opcjonalnie: wypełnij klucze Paynow w .env
docker compose up --build
```

## URL-e po uruchomieniu

| Serwis | URL |
|---|---|
| Aplikacja użytkownika | http://localhost |
| Panel administratora | http://localhost/admin |
| Panel inspektora | http://localhost/inspektor/ |
| Swagger UI | http://localhost/swagger-ui.html |

## Konta testowe (seed)

| Rola | Email | Hasło |
|---|---|---|
| Administrator | admin@krakow-parking.local | Admin123! |
| Użytkownik | user@krakow-parking.local | User12345! |
| Właściciel parkingu | owner@krakow-parking.local | Owner123! |
| Inspektor | inspector@parking.local | Inspector123! |

---

## Role użytkowników

| Rola | Opis |
|---|---|
| `ADMIN` | Pełny dostęp do panelu administracyjnego: parkingi, cenniki, SCT, użytkownicy, IoT |
| `PARKING_OWNER` | Zarządzanie własnymi parkingami: obłożenie, miejsca, cennik, dodawanie nowych |
| `USER` | Profil, pojazdy, rezerwacje, sesje parkingowe, wyszukiwarka |
| `INSPECTOR` | Dostęp do panelu inspektora: weryfikacja tablic, obsługa wyjazdu |

Role nadaje administrator. Użytkownik może mieć wiele ról jednocześnie.

---

## Funkcjonalności

### Uwierzytelnianie i autoryzacja

- Rejestracja z walidacją formatu e-mail i siły hasła
- Logowanie — JWT (Bearer token w nagłówku `Authorization`)
- Hashowanie haseł BCrypt
- Zmiana hasła z walidacją (stare hasło + potwierdzenie)
- Blokowanie i usuwanie kont przez administratora

### Zarządzanie parkingami

- CRUD parkingów przez administratora i właściciela
- Statusy: `ACTIVE`, `INACTIVE`, `TEMPORARILY_CLOSED`, `PENDING_APPROVAL`
- Nowe parkingi tworzone przez właścicieli wymagają zatwierdzenia przez admina
- **Typ dostępu** (ustawiany przy tworzeniu przez właściciela lub admina):
  - `BARRIER` — parking z szlabanem; obsługuje rezerwacje i wjazd bez rezerwacji
  - `OPEN` — parking otwarty bez szlabanu; płatność z góry przed wjazdem
- Strefy cenowe: `ZONE_A`, `ZONE_B`, `ZONE_C`
- Typy parkingu: `PUBLIC`, `PRIVATE`, `UNDERGROUND`, `PARK_AND_RIDE`
- Kategorie miejsc: `REGULAR`, `EV`, `DISABLED`, `SCT_READY`
- Przypisanie właściciela przez administratora

### Cenniki

- Cennik strefowy (ZONE_A / B / C)
- Indywidualny cennik parkingu (nadpisuje strefowy)
- Stawki: 1. godzina, 2. godzina, 3. godzina, kolejne godziny, cena dobowa
- Kalkulacja automatycznie wybiera tańszy tryb (godzinowy vs dobowy)
- Czas pobytu zaokrąglany w górę do pełnych godzin (`ceil`)

### Strefa Czystego Transportu (SCT)

- Reguły wjazdu według rodzaju paliwa i normy emisji spalin (Euro 1–6)
- Wynik weryfikacji: `ALL_SPOTS`, `SCT_SPOTS_ONLY`, `NOT_ALLOWED`
- Weryfikacja pojazdu automatycznie przy wyszukiwaniu (aktywny pojazd użytkownika)

### Profil użytkownika

- Edycja danych (imię, nazwisko)
- Zarządzanie wieloma pojazdami (dodawanie, edycja, usuwanie)
- Wybór aktywnego pojazdu — filtr SCT i wypełnienie tablicy ustawiany automatycznie

### Wyszukiwarka parkingów

- Filtrowanie: lokalizacja GPS + promień (km), nazwa, strefa, dostępność, godziny otwarcia
- Filtr SCT według paliwa i normy emisji aktywnego pojazdu
- Sortowanie: odległość, cena, liczba wolnych miejsc
- Przewidywany koszt przy zadanym czasie postoju
- Wyświetlanie typu dostępu (szlaban / otwarty)
- **Akcje inline na kartach parkingów:**
  - BARRIER: przycisk „Wjedź teraz" — formularz tablicy → rejestracja wjazdu bez rezerwacji
  - OPEN: przycisk „Rozpocznij pobyt" — tablica + godzina wyjazdu → wyliczenie kwoty → płatność
  - Baner „Twój pojazd jest na tym parkingu" gdy użytkownik ma aktywną sesję na danym parkingu

### Rezerwacje (tylko parkingi BARRIER)

- Tworzenie rezerwacji z wyborem daty i godziny (od–do)
- Statusy: `PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `EXPIRED`
- Rezerwacja aktywna dopiero po opłaceniu
- Blokada rezerwacji gdy parking pełny lub jest typem OPEN

### Sesje parkingowe (wjazd bez rezerwacji)

#### Parking z szlabanem (BARRIER)

1. Kamera wjazdowa (panel IoT) lub użytkownik ręcznie rejestruje tablicę → sesja `ACTIVE`
2. Przy wyjeździe inspektor lub kamera wyjazdowa inicjuje płatność → kwota od czasu wjazdu (ceil do pełnych godzin) → `PAYMENT_PENDING`
3. Kierowca płaci przez Paynow → sesja `PAID` → szlaban otwiera się

#### Parking otwarty (OPEN)

1. Użytkownik wpisuje tablicę i **planowaną godzinę wyjazdu** (godzina od = teraz)
2. System oblicza koszt z góry: `ceil(minuty / 60)` pełnych godzin × stawka
3. Użytkownik płaci przez Paynow z góry → sesja `PAID` z terminem ważności
4. Inspektor sprawdza tablicę → widzi czy sesja PAID jest ważna (`godz_do ≥ teraz`)

Statusy sesji: `ACTIVE` → `PAYMENT_PENDING` → `PAID` / `CANCELLED`

### Płatności (Paynow)

- Integracja z bramką **Paynow** (sandbox) dla rezerwacji i sesji parkingowych
- Podpisywanie żądań HMAC-SHA256 (Base64)
- Przepływ: kliknięcie „Zapłać przez Paynow" → przekierowanie na bramkę → powrót do aplikacji z tokenem w URL → automatyczne potwierdzenie
- URL powrotu:
  - Rezerwacje: `PAYNOW_CONTINUE_URL?paynow=TOKEN` → zakładka Rezerwacje
  - Sesje: `PAYNOW_CONTINUE_URL` (ścieżka `/sesje`)`?session_paynow=TOKEN` → zakładka Sesje
- Gdy klucze nie są skonfigurowane — lokalne potwierdzenie bez przekierowania (fallback)

### Panel inspektora (`/inspektor/`)

Samodzielna aplikacja webowa (HTML + JS, bez frameworka) dla inspektorów i urządzeń bramkowych.

**Wymaga logowania** — konto z rolą `INSPECTOR` lub `ADMIN`.

- **Zakładka „Sprawdź tablicę"** — numer rejestracyjny → wynik:
  - ✓ OPŁACONY — aktywna płatna sesja lub potwierdzona rezerwacja
  - ⚠ CZAS MINĄŁ — sesja OPEN po terminie ważności
  - ⚠ OCZEKUJE NA PŁATNOŚĆ — sesja zainicjowana, niezapłacona
  - ✗ BRAK OPŁATY — brak aktywnej sesji ani rezerwacji
- **Zakładka „Opłata przy wyjściu"** — dla parkingów BARRIER:
  - Podaj tablicę → system oblicza kwotę od czasu wjazdu → przycisk „Zapłać przez Paynow"

### Powiadomienia w aplikacji

- Powiadomienie o zbliżającym się końcu rezerwacji (15 min przed końcem)
- Powiadomienie o wygaśnięciu rezerwacji
- Powiadomienie o potwierdzeniu rezerwacji po opłaceniu
- Licznik nieprzeczytanych w pasku nawigacji

### Panel administratora (`/admin`)

- Zarządzanie parkingami: CRUD, zatwierdzanie wniosków właścicieli, przypisywanie właściciela
- Zarządzanie cenami strefowymi i indywidualnymi
- Zarządzanie użytkownikami: przeglądanie, zmiana ról (checkbox per rola), blokowanie, reset hasła
- Zarządzanie regułami SCT
- Raporty obłożenia (bieżące i historyczne)
- **Panel IoT** — symulacja kamer parkingowych:
  - Kamera wjazdowa: rejestracja wjazdu pojazdu (wybór parkingu + tablica)
  - Kamera wyjazdowa: sprawdzenie tablicy i status opłaty

### Panel właściciela parkingu (zakładka w aplikacji użytkownika)

- Podgląd przypisanych parkingów z filtrowaniem i sortowaniem
- Aktualizacja obłożenia miejsc
- Konfiguracja kategorii miejsc (REGULAR, EV, DISABLED, SCT_READY)
- Ustawianie cennika (stawki godzinowe i dobowa)
- Dodawanie nowych parkingów:
  - Wybór strefy, typu, **typu dostępu (BARRIER / OPEN)**, lokalizacja na mapie
  - Nowy parking trafia do statusu `PENDING_APPROVAL` — wymaga zatwierdzenia przez admina

---

## Struktura katalogów

```
backend/              Spring Boot API, migracje Flyway (V1–V22), testy
admin-frontend/       Panel administratora (React + TypeScript)
user-frontend/        Aplikacja użytkownika (React + TypeScript)
inspector-frontend/   Panel inspektora (standalone HTML + JS)
nginx/                Konfiguracja reverse proxy
docs/                 Przykładowe requesty HTTP
```

## Architektura

- **Auth: JWT** — stateless; token zwracany przy logowaniu, przekazywany jako `Authorization: Bearer <token>`.
- **Baza: PostgreSQL + PostGIS** — zapytania przestrzenne (`ST_DWithin`) do wyszukiwania w promieniu.
- **Cache: Redis** — sesje i dane tymczasowe.
- **Migracje: Flyway** — wersjonowane migracje SQL V1–V22.
- **Walidacja: Bean Validation + DB constraints** — adnotacje na DTO + `CHECK` constrainty w bazie.
- **Płatności: Paynow** — przekierowanie na bramkę; fallback lokalny gdy brak kluczy.
- **Reverse proxy: Nginx** — `/api/` → backend, `/admin/` → admin-frontend, `/inspektor/` → statyczny HTML.

## Zmienne środowiskowe

| Zmienna | Opis | Domyślnie |
|---|---|---|
| `PAYNOW_API_KEY` | Klucz API bramki Paynow (sandbox) | — (wyłączone) |
| `PAYNOW_SIGNATURE_KEY` | Klucz podpisu HMAC Paynow | — (wyłączone) |
| `PAYNOW_CONTINUE_URL` | Bazowy URL powrotu po płatności | `http://localhost/rezerwacje` |
| `DB_NAME` | Nazwa bazy danych | `krakow_parking` |
| `DB_USER` | Użytkownik bazy | `parking_user` |
| `DB_PASSWORD` | Hasło bazy | `parking_pass` |

## Komendy deweloperskie

```bash
# Backend
cd backend && ./gradlew build
cd backend && ./gradlew test

# User frontend
cd user-frontend && npm install && npm run dev

# Admin frontend
cd admin-frontend && npm install && npm run dev
```

## Seed data

Przy pierwszym uruchomieniu backend zasila bazę:

- **Konta:** ADMIN, USER, PARKING_OWNER, INSPECTOR
- **Parkingi BARRIER:** Bonarka City Center, Galeria Kazimierz, Rynek Główny
- **Parkingi OPEN:** Galeria Krakowska, P+R Czerwone Maki, P+R Bieżanów, Wawel, ICE Kraków
- **Cenniki** dla stref A, B, C i indywidualne dla wybranych parkingów
- **Pojazdy testowe** przypisane do konta użytkownika
- **Reguły SCT** dla stref A, B i C
