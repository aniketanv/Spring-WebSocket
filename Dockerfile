# ---------- Build stage ----------
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# 1. Copy POM and install dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# 2. Copy Backend Source
COPY src ./src

# 3. CRITICAL: Copy Frontend Source (You were missing this!)
COPY frontend ./frontend

# 4. Build (This runs npm install -> npm build -> packages jar)
RUN mvn clean package -DskipTests

# ---------- Run stage ----------
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]