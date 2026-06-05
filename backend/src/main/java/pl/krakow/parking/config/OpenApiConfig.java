package pl.krakow.parking.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI parkingOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("Krakow Parking API")
                .version("0.0.1-SNAPSHOT")
                .description("MVP scaffold API for Krakow parking discovery, SCT verification and price calculation.")
                .contact(new Contact().name("Krakow Parking Team")));
    }
}
