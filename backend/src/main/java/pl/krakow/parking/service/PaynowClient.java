package pl.krakow.parking.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pl.krakow.parking.config.PaynowProperties;

@Service
public class PaynowClient {

    private static final Logger log = LoggerFactory.getLogger(PaynowClient.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final PaynowProperties props;
    private final HttpClient httpClient;

    public PaynowClient(PaynowProperties props) {
        this.props = props;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    }

    public record PaymentInitResult(String redirectUrl, String externalPaymentId) {}

    /**
     * Initiates a Paynow payment. Returns null if Paynow is not configured (use local simulation instead).
     */
    public PaymentInitResult initiatePayment(String internalToken, BigDecimal amount, String description, String buyerEmail, String continueUrl) {
        if (!props.isConfigured()) {
            return null;
        }
        try {
            String idempotencyKey = UUID.randomUUID().toString();
            long amountGrosze = amount.multiply(BigDecimal.valueOf(100)).longValue();

            String body = MAPPER.writeValueAsString(Map.of(
                "amount", amountGrosze,
                "currency", "PLN",
                "externalId", internalToken,
                "description", description,
                "buyer", Map.of("email", buyerEmail),
                "continueUrl", continueUrl
            ));

            String signature = computeHmac(body, props.getSignatureKey());

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(props.getApiUrl() + "/v1/payments"))
                .timeout(Duration.ofSeconds(15))
                .header("Api-Key", props.getApiKey())
                .header("Signature", signature)
                .header("Idempotency-Key", idempotencyKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200 && response.statusCode() != 201) {
                log.warn("Paynow API returned status {}: {}", response.statusCode(), response.body());
                return null;
            }

            JsonNode node = MAPPER.readTree(response.body());
            String redirectUrl = node.path("redirectUrl").asText(null);
            String externalId = node.path("paymentId").asText(null);
            return new PaymentInitResult(redirectUrl, externalId);

        } catch (Exception e) {
            log.warn("Failed to initiate Paynow payment: {}", e.getMessage());
            return null;
        }
    }

    public String getPaymentStatus(String externalPaymentId) {
        if (!props.isConfigured() || externalPaymentId == null) {
            return null;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(props.getApiUrl() + "/v1/payments/" + externalPaymentId))
                .timeout(Duration.ofSeconds(10))
                .header("Api-Key", props.getApiKey())
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) return null;

            JsonNode node = MAPPER.readTree(response.body());
            return node.path("status").asText(null);

        } catch (Exception e) {
            log.warn("Failed to get Paynow payment status: {}", e.getMessage());
            return null;
        }
    }

    private static String computeHmac(String data, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(hash);
    }
}
