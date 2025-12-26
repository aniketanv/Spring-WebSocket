# ---------- Build stage ----------
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# 1. Copy POM and download Java dependencies (caching layer)
COPY pom.xml .
RUN mvn dependency:go-offline

# 2. Copy Java Source
COPY src ./src

# 3. CRITICAL: Copy Frontend Source so Maven can build it
COPY frontend ./frontend

# 4. Build everything (Java + React)
RUN mvn clean package -DskipTests

# ---------- Run stage ----------
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]