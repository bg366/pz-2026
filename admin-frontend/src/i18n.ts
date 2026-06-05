export const PL = {
  parkingStatus: { ACTIVE: "Aktywny", INACTIVE: "Nieaktywny", TEMPORARILY_CLOSED: "Tymcz. zamknięty", PENDING_APPROVAL: "Oczekuje na zatwierdzenie" } as Record<string, string>,
  zone: { ZONE_A: "Strefa A", ZONE_B: "Strefa B", ZONE_C: "Strefa C" } as Record<string, string>,
  userRole: { ADMIN: "Administrator", PARKING_OWNER: "Właściciel parkingu", USER: "Użytkownik" } as Record<string, string>,
  userStatus: { ACTIVE: "Aktywny", BLOCKED: "Zablokowany", DELETED: "Usunięty" } as Record<string, string>,
  iotStatus: { ACTIVE: "Aktywny", INACTIVE: "Nieaktywny", ERROR: "Błąd" } as Record<string, string>,
  spotCategory: { REGULAR: "Standardowe", EV: "Elektryczne", DISABLED: "Niepełnosprawni", SCT_READY: "SCT" } as Record<string, string>,
  priceField: {
    firstHourPrice: "1. godzina", secondHourPrice: "2. godzina",
    thirdHourPrice: "3. godzina", nextHourPrice: "Każda kolejna godz.", dailyPrice: "Cena dobowa"
  } as Record<string, string>,
  parkingType: { PUBLIC: "Publiczny", PRIVATE: "Prywatny", PARK_AND_RIDE: "Park & Ride", UNDERGROUND: "Podziemny" } as Record<string, string>,
  fuelType: { PETROL: "Benzyna", DIESEL: "Diesel", LPG: "LPG", HYBRID: "Hybryda", ELECTRIC: "Elektryczny" } as Record<string, string>,
  emission: {
    EURO_1: "Euro 1", EURO_2: "Euro 2", EURO_3: "Euro 3",
    EURO_4: "Euro 4", EURO_5: "Euro 5", EURO_6: "Euro 6", ELECTRIC: "Elektryczny"
  } as Record<string, string>,
};

export function pl(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
