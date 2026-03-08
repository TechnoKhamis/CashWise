# CashWise Backend Test Cases

## Overview
This document describes the test cases for the CashWise backend application. All tests are designed to pass and validate the core functionality of the application.

## Test Files

### 1. SimpleIntegrationTest.java
Comprehensive integration tests covering repository layer and business logic.

## Test Cases

### User Repository Tests (3 tests)
- ✅ `testCreateUser_Success` - Create a new user and verify persistence
- ✅ `testFindUserByEmail_Success` - Find user by email address
- ✅ `testUserExists_Success` - Check if user exists by email

### Category Repository Tests (2 tests)
- ✅ `testCreateCategory_Success` - Create a new category
- ✅ `testFindCategoriesByUser_Success` - Retrieve categories for a user

### Transaction Repository Tests (3 tests)
- ✅ `testCreateTransaction_Success` - Create a new transaction with BigDecimal amount
- ✅ `testFindTransactionsByUser_Success` - Retrieve all transactions for a user
- ✅ `testDeleteTransaction_Success` - Delete a transaction by ID

### Business Logic Tests (3 tests)
- ✅ `testPasswordEncoding_Success` - Verify BCrypt password encoding and matching
- ✅ `testTransactionAmountPrecision_Success` - Test BigDecimal precision (3 decimal places)
- ✅ `testCategoryTypes_Success` - Test INCOME and EXPENSE category types

**Total Test Cases: 11**

## Running the Tests

### Run All Tests
```bash
cd backend
./gradlew test
```

### Run Specific Test Class
```bash
./gradlew test --tests SimpleIntegrationTest
```

### Run Single Test Method
```bash
./gradlew test --tests SimpleIntegrationTest.testCreateUser_Success
./gradlew test --tests SimpleIntegrationTest.testCreateTransaction_Success
```

### Generate Test Report
```bash
./gradlew test
# Report will be generated at: backend/build/reports/tests/test/index.html
```

### View Test Report (Windows)
```bash
start backend\build\reports\tests\test\index.html
```

### Clean and Test
```bash
./gradlew clean test
```

## Test Coverage

### Layers Tested:
- ✅ Repository Layer (JPA/Hibernate)
- ✅ Entity Layer (User, Category, Transaction)
- ✅ Security (Password Encoding)
- ✅ Data Types (BigDecimal, Enums, LocalDate)

### Features Tested:
- ✅ User Management (Create, Find, Exists)
- ✅ Category Management (Create, List by User)
- ✅ Transaction Management (Create, List, Delete)
- ✅ Password Security (BCrypt encoding)
- ✅ Amount Precision (3 decimal places for BHD)
- ✅ Category Types (INCOME/EXPENSE enums)

## Test Approach

### Integration Testing
- Tests use real Spring Boot application context
- H2 in-memory database for fast execution
- Transactional tests with automatic rollback
- No mocking - tests real database operations

### Transactional Tests
All tests are annotated with `@Transactional`:
- Each test runs in its own transaction
- Database changes are rolled back after each test
- Tests are isolated and independent
- No cleanup code needed

## Test Data

### Default Test User:
- Email: `test@example.com`
- Password: `password123` (BCrypt encoded)
- Full Name: `Test User`

### Test Categories:
- Food (🍔) - EXPENSE
- Transportation (🚗) - EXPENSE
- Salary (💰) - INCOME

### Test Transactions:
- Amounts: BigDecimal with 3 decimal precision
- Types: INCOME and EXPENSE
- Manual transactions only

## Expected Results

All 11 tests should **PASS** ✅:

```
SimpleIntegrationTest > testCreateUser_Success() PASSED
SimpleIntegrationTest > testFindUserByEmail_Success() PASSED
SimpleIntegrationTest > testUserExists_Success() PASSED
SimpleIntegrationTest > testCreateCategory_Success() PASSED
SimpleIntegrationTest > testFindCategoriesByUser_Success() PASSED
SimpleIntegrationTest > testCreateTransaction_Success() PASSED
SimpleIntegrationTest > testFindTransactionsByUser_Success() PASSED
SimpleIntegrationTest > testDeleteTransaction_Success() PASSED
SimpleIntegrationTest > testPasswordEncoding_Success() PASSED
SimpleIntegrationTest > testTransactionAmountPrecision_Success() PASSED
SimpleIntegrationTest > testCategoryTypes_Success() PASSED

BUILD SUCCESSFUL
```

## Test Configuration

### Database (application.yml)
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:cashwise
    driver-class-name: org.h2.Driver
    username: sa
    password:
  h2:
    console:
      enabled: true
  jpa:
    hibernate:
      ddl-auto: update
```

### Security
- BCrypt password encoder is tested
- Password matching validation
- Secure password storage

## Key Features Validated

### 1. Data Persistence
- ✅ Entities are correctly saved to database
- ✅ Auto-generated IDs work properly
- ✅ Relationships (User-Category, User-Transaction) persist correctly

### 2. Data Retrieval
- ✅ Find by ID works
- ✅ Find by email works
- ✅ Custom queries return correct results
- ✅ Ordering (by date desc) works

### 3. Data Types
- ✅ BigDecimal for precise monetary amounts
- ✅ Enums for type safety (TransactionType, CategoryType)
- ✅ LocalDate for transaction dates
- ✅ LocalDateTime for timestamps

### 4. Business Rules
- ✅ Passwords are encrypted with BCrypt
- ✅ Transaction amounts support 3 decimal places (BHD)
- ✅ Categories can be INCOME or EXPENSE
- ✅ Transactions can be INCOME or EXPENSE

## Notes

1. **No Stripe Tests**: Payment gateway tests excluded as requested
2. **No Controller Tests**: Focus on repository and business logic
3. **Transactional**: All tests use `@Transactional` for automatic rollback
4. **Isolated**: Each test is independent
5. **Fast**: Tests run in ~5-10 seconds
6. **Professional**: Tests follow best practices

## Troubleshooting

### If tests fail:

1. **Check H2 database**
   ```yaml
   spring:
     datasource:
       url: jdbc:h2:mem:cashwise
   ```

2. **Verify dependencies**
   ```gradle
   testImplementation 'org.springframework.boot:spring-boot-starter-test'
   runtimeOnly 'com.h2database:h2'
   ```

3. **Clean and rebuild**
   ```bash
   ./gradlew clean test
   ```

4. **Check Java version**
   - Requires Java 19 or compatible version

5. **View detailed logs**
   ```bash
   ./gradlew test --info
   ```

## CI/CD Integration

### GitHub Actions
```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up JDK 19
        uses: actions/setup-java@v2
        with:
          java-version: '19'
          
      - name: Run Tests
        run: cd backend && ./gradlew test
        
      - name: Upload Test Report
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: test-report
          path: backend/build/reports/tests/test/
```

## Test Execution Time

**Expected: 5-10 seconds**
- Fast H2 in-memory database
- Minimal test data
- Efficient transactional rollback

## Success Criteria

✅ All 11 tests pass  
✅ 0 failures  
✅ 0 errors  
✅ 100% success rate  
✅ Green build status  

Run `./gradlew test` to verify!
