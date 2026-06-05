FROM --platform=linux/amd64 eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
ENV GRADLE_WRAPPER_SKIP_DOCKER=1
COPY gradle/ gradle/
COPY gradlew gradle.properties build.gradle.kts settings.gradle.kts ./
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew
RUN ./gradlew dependencies --no-daemon
COPY src/ src/
RUN ./gradlew bootJar --no-daemon

FROM --platform=linux/amd64 eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
