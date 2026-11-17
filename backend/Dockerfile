FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
COPY src ./src
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN groupadd --system warehouse && useradd --system --gid warehouse warehouse
COPY --from=build /build/target/warehouse-center-0.0.1-SNAPSHOT.jar app.jar
USER warehouse
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
