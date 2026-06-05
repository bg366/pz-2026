package pl.krakow.parking.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "paynow")
public class PaynowProperties {

    private String apiKey = "";
    private String signatureKey = "";
    private String apiUrl = "https://api.sandbox.paynow.pl";
    private String continueUrl = "http://localhost:3000/rezerwacje";

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank()
            && signatureKey != null && !signatureKey.isBlank();
    }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getSignatureKey() { return signatureKey; }
    public void setSignatureKey(String signatureKey) { this.signatureKey = signatureKey; }

    public String getApiUrl() { return apiUrl; }
    public void setApiUrl(String apiUrl) { this.apiUrl = apiUrl; }

    public String getContinueUrl() { return continueUrl; }
    public void setContinueUrl(String continueUrl) { this.continueUrl = continueUrl; }
}
