package pl.krakow.parking;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class KrakowParkingApplicationTests {

    @Test
    void shouldExposeApplicationClass() {
        assertThat(KrakowParkingApplication.class).isNotNull();
    }
}
