# Krakow Parking MVP

Scaffold środowiska developerskiego dla aplikacji parkingowej dla Krakowa. Repozytorium stawia backend Spring Boot, dwa frontendy React, PostGIS, Redis oraz reverse proxy Nginx, tak aby zespół mógł wystartować cały stack jednym poleceniem i od razu zacząć implementować logikę biznesową.

Projekt zawiera przykładowe endpointy, migracje bazy, seed data dla parkingów w Krakowie oraz minimalne placeholdery UI dla panelu administratora i aplikacji użytkownika.

## Wymagania

- Docker
- Docker Compose

## Quick Start

```bash
cp .env.example .env
docker-compose up --build
```

## URL-e po uruchomieniu

- Aplikacja użytkownika: `http://localhost:80`
- Panel admina: `http://localhost:80/admin`
- Swagger UI: `http://localhost:80/swagger-ui.html`
- Backend bezpośrednio: `http://localhost:8080`
- User frontend bezpośrednio: `http://localhost:3000`
- Admin frontend bezpośrednio: `http://localhost:3001`

## Struktura katalogów

- `backend/` - API Spring Boot, migracje Flyway, seed data, testy
- `admin-frontend/` - panel administratora React + TypeScript
- `user-frontend/` - aplikacja użytkownika React + TypeScript
- `nginx/` - konfiguracja reverse proxy
- `docs/` - przykładowe requesty HTTP do manualnych testów

## Seed Data

Przy pierwszym uruchomieniu backend zasili bazę przykładowymi parkingami w Krakowie:

- Parking Galeria Krakowska
- Parking Bonarka City Center
- Parking Galeria Kazimierz
- Parking P+R Czerwone Maki
- Parking P+R Bieżanów
- Parking Rynek Główny
- Parking Wawel
- Parking ICE Kraków

Dla każdego parkingu dodawane są kategorie miejsc, domyślne taryfy oraz losowe obłożenie. Seed obejmuje też przykładowe reguły SCT dla stref A, B i C.

## Przydatne komendy

```bash
curl http://localhost:80/api/admin/parking-lots
curl "http://localhost:80/api/parking-lots/search?lat=50.06&lng=19.94&radiusKm=5"
curl -X POST http://localhost:80/api/vehicles/check \
  -H "Content-Type: application/json" \
  -d '{"fuelType":"DIESEL","emissionStandard":"EURO_3","zone":"ZONE_A"}'
```

## TODO

- Dodać uwierzytelnianie i autoryzację admina
- Dodać integrację płatności parkingowych
- Dodać integrację z urządzeniami IoT i czujnikami zajętości
- Dodać rozpoznawanie tablic rejestracyjnych (LPR)
- Dodać pełną logikę rezerwacji i płatności

