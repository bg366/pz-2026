package pl.krakow.parking.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pl.krakow.parking.model.User;

@Service
public class JwtService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final ObjectMapper objectMapper;
    private final String secret;
    private final long expirationSeconds;

    public JwtService(
        ObjectMapper objectMapper,
        @Value("${security.jwt.secret:local-development-secret-change-me}") String secret,
        @Value("${security.jwt.expiration-seconds:86400}") long expirationSeconds
    ) {
        this.objectMapper = objectMapper;
        this.secret = secret;
        this.expirationSeconds = expirationSeconds;
    }

    public String generateToken(User user) {
        long now = Instant.now().getEpochSecond();
        Map<String, Object> header = new LinkedHashMap<>();
        header.put("alg", "HS256");
        header.put("typ", "JWT");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", user.getEmail());
        payload.put("uid", user.getId());
        payload.put("roles", user.getRoles().stream().map(Enum::name).toList());
        payload.put("iat", now);
        payload.put("exp", now + expirationSeconds);

        String headerPart = encodeJson(header);
        String payloadPart = encodeJson(payload);
        String unsignedToken = headerPart + "." + payloadPart;
        return unsignedToken + "." + sign(unsignedToken);
    }

    public String extractSubject(String token) {
        Map<String, Object> payload = validateAndReadPayload(token);
        Object subject = payload.get("sub");
        if (!(subject instanceof String email) || email.isBlank()) {
            throw new IllegalArgumentException("Token JWT nie zawiera uzytkownika.");
        }
        return email;
    }

    public boolean isValid(String token) {
        try {
            validateAndReadPayload(token);
            return true;
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private Map<String, Object> validateAndReadPayload(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new IllegalArgumentException("Nieprawidlowy token JWT.");
        }

        String unsignedToken = parts[0] + "." + parts[1];
        if (!constantTimeEquals(sign(unsignedToken), parts[2])) {
            throw new IllegalArgumentException("Nieprawidlowy podpis tokena JWT.");
        }

        Map<String, Object> payload = decodeJson(parts[1]);
        Object exp = payload.get("exp");
        long expiresAt = exp instanceof Number number ? number.longValue() : -1;
        if (expiresAt <= Instant.now().getEpochSecond()) {
            throw new IllegalArgumentException("Token JWT wygasl.");
        }
        return payload;
    }

    private String encodeJson(Map<String, Object> value) {
        try {
            return BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
        } catch (Exception exception) {
            throw new IllegalStateException("Nie udalo sie utworzyc tokena JWT.", exception);
        }
    }

    private Map<String, Object> decodeJson(String value) {
        try {
            return objectMapper.readValue(BASE64_URL_DECODER.decode(value), MAP_TYPE);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Nieprawidlowa tresc tokena JWT.", exception);
        }
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return BASE64_URL_ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Nie udalo sie podpisac tokena JWT.", exception);
        }
    }

    private boolean constantTimeEquals(String expected, String actual) {
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        byte[] actualBytes = actual.getBytes(StandardCharsets.UTF_8);
        if (expectedBytes.length != actualBytes.length) {
            return false;
        }

        int result = 0;
        for (int i = 0; i < expectedBytes.length; i++) {
            result |= expectedBytes[i] ^ actualBytes[i];
        }
        return result == 0;
    }
}
