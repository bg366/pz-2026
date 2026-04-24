package pl.krakow.parking.model;

public enum EmissionStandard {
    EURO_1,
    EURO_2,
    EURO_3,
    EURO_4,
    EURO_5,
    EURO_6,
    ELECTRIC;

    public boolean isAtLeast(EmissionStandard required) {
        return this.ordinal() >= required.ordinal();
    }
}
