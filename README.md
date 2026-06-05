# Krakow Parking System

System zarządzania miejscami parkingowymi dla Krakowa. Obejmuje REST API Spring Boot, panel administratora React, aplikację użytkownika React, PostGIS, Redis i reverse proxy Nginx.

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
| Swagger UI | http://localhost:80/swagger-ui.html |
| Backend | http://localhost:8080 |
| User frontend (dev) | http://localhost:3000 |
| Admin frontend (dev) | http://localhost:3001 |

## Konta testowe

| Rola | Email | Hasło |
|---|---|---|
| Administrator | admin@krakow-parking.local | Admin123! |
| Użytkownik | user@krakow-parking.local | User12345! |

## Role użytkowników

- **ADMIN** — pełny dostęp do panelu administracyjnego: zarządzanie parkingami, cenniki, reguły SCT, użytkownicy, raporty.
- **PARKING_OWNER** — dostęp do `/api/owner/parking-lots`: edycja przypisanych parkingów, aktualizacja obłożenia i konfiguracji miejsc. Rolę nadaje wyłącznie administrator.
- **USER** — dostęp do własnego profilu, pojazdów i publicznych endpointów wyszukiwania.

## Funkcje gotowe

### Uwierzytelnianie i autoryzacja
- Rejestracja i logowanie (HTTP Basic Auth, token Base64 w nagłówku `Authorization`)
- Hashowanie haseł BCrypt
- Role: ADMIN, PARKING_OWNER, USER
- Blokowanie i usuwanie kont

### Zarządzanie parkingami
- CRUD parkingów (admin/właściciel)
- Statusy: ACTIVE, INACTIVE, TEMPORARILY_CLOSED
- Strefy cenowe: ZONE_A, ZONE_B, ZONE_C
- Konfiguracja kategorii miejsc: REGULAR, EV, DISABLED, SCT_READY
- Aktualizacja obłożenia

### Cenniki
- Cennik strefowy (ZONE_A/B/C)
- Indywidualny cennik parkingu
- Stawki: 1. godzina, 2. godzina, 3. godzina, kolejne godziny, cena dobowa
- Kalkulacja kosztu z rozbiciem i wyborem trybu (godzinowy vs dobowy)

### Strefy SCT (Strefa Czystego Transportu)
- Reguły wjazdu według paliwa i normy emisji
- Decyzja: ALL_SPOTS, SCT_SPOTS_ONLY, NOT_ALLOWED
- Weryfikacja pojazdu przed wjazdem

### Profil użytkownika
- Edycja danych konta
- Zarządzanie wieloma pojazdami
- Wybór aktywnego pojazdu (automatycznie przekazywany do wyszukiwarki)

### Wyszukiwanie parkingów
- Filtrowanie po lokalizacji, promieniu, nazwie, strefie, dostępności, statusie otwarcia
- Sortowanie: odległość, cena, wolne miejsca
- Przewidywany koszt postoju przy podanym czasie parkowania

### Raporty
- Aktualne obłożenie parkingów
- Historia obłożenia (dzienne, miesięczne raporty)

## Struktura katalogów

```
backend/          Spring Boot API, migracje Flyway, testy
admin-frontend/   Panel administratora React + TypeScript
user-frontend/    Aplikacja użytkownika React + TypeScript
nginx/            Konfiguracja reverse proxy
docs/             Przykładowe requesty HTTP
```

## Decyzje architektoniczne

- **Auth: HTTP Basic + token Base64** — uproszczone stateless uwierzytelnianie; token to `Base64(email:password)` przekazywany w nagłówku `Authorization: Basic <token>`.
- **Baza: PostgreSQL + PostGIS** — zapytania przestrzenne (`ST_DWithin`) do wyszukiwania parkingów w promieniu.
- **Migracje: Flyway** — wersjonowane migracje SQL od V1 do V13.
- **Walidacja: Bean Validation + DB constraints** — adnotacje na DTO + constrainty CHECK w bazie danych.

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
- 8 parkingów w Krakowie z obłożeniem, kategoriami miejsc i cennikami
- Konta testowe ADMIN i USER
- Przykładowe pojazdy dla konta użytkownika
- Reguły SCT dla stref A, B i C

## Funkcje planowane (P3)

- Mapa Krakowa z markerami parkingów (Leaflet)
- Rezerwacje miejsc parkingowych
- Płatności online
- Integracja z urządzeniami IoT i czujnikami zajętości
- Rozpoznawanie tablic rejestracyjnych (LPR)
- Powiadomienia o kończącym się postoju
