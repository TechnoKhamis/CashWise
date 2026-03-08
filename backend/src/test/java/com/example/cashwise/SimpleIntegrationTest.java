package com.example.cashwise;

import com.example.cashwise.entity.Category;
import com.example.cashwise.entity.Transaction;
import com.example.cashwise.entity.User;
import com.example.cashwise.repository.CategoryRepository;
import com.example.cashwise.repository.TransactionRepository;
import com.example.cashwise.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class SimpleIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testUser;
    private Category testCategory;

    @BeforeEach
    void setUp() {
        transactionRepository.deleteAll();
        categoryRepository.deleteAll();
        userRepository.deleteAll();

        // Create test user
        testUser = new User("Test User", "test@example.com", 
                passwordEncoder.encode("password123"), null);
        testUser = userRepository.save(testUser);

        // Create test category
        testCategory = new Category();
        testCategory.setName("Food");
        testCategory.setEmoji("🍔");
        testCategory.setType(Category.CategoryType.EXPENSE);
        testCategory.setUser(testUser);
        testCategory = categoryRepository.save(testCategory);
    }

    // ========== User Repository Tests ==========

    @Test
    void testCreateUser_Success() {
        User user = new User("John Doe", "john@example.com", 
                passwordEncoder.encode("password"), null);
        User saved = userRepository.save(user);

        assertNotNull(saved.getId());
        assertEquals("John Doe", saved.getFullName());
        assertEquals("john@example.com", saved.getEmail());
    }

    @Test
    void testFindUserByEmail_Success() {
        User found = userRepository.findByEmail("test@example.com").orElse(null);

        assertNotNull(found);
        assertEquals("Test User", found.getFullName());
    }

    @Test
    void testUserExists_Success() {
        boolean exists = userRepository.existsByEmail("test@example.com");
        assertTrue(exists);

        boolean notExists = userRepository.existsByEmail("nonexistent@example.com");
        assertFalse(notExists);
    }

    // ========== Category Repository Tests ==========

    @Test
    void testCreateCategory_Success() {
        Category category = new Category();
        category.setName("Transportation");
        category.setEmoji("🚗");
        category.setType(Category.CategoryType.EXPENSE);
        category.setUser(testUser);
        
        Category saved = categoryRepository.save(category);

        assertNotNull(saved.getId());
        assertEquals("Transportation", saved.getName());
        assertEquals(Category.CategoryType.EXPENSE, saved.getType());
    }

    @Test
    void testFindCategoriesByUser_Success() {
        // Create additional category
        Category category2 = new Category();
        category2.setName("Salary");
        category2.setEmoji("💰");
        category2.setType(Category.CategoryType.INCOME);
        category2.setUser(testUser);
        categoryRepository.save(category2);

        List<Category> categories = categoryRepository.findByUserIdOrIsDefaultTrue(testUser.getId());

        assertTrue(categories.size() >= 2);
    }

    // ========== Transaction Repository Tests ==========

    @Test
    void testCreateTransaction_Success() {
        Transaction tx = new Transaction();
        tx.setAmount(new BigDecimal("100.50"));
        tx.setDescription("Test transaction");
        tx.setType(Transaction.TransactionType.EXPENSE);
        tx.setTransactionDate(LocalDate.now());
        tx.setIsManual(true);
        tx.setUser(testUser);
        tx.setCategory(testCategory);
        
        Transaction saved = transactionRepository.save(tx);

        assertNotNull(saved.getId());
        assertEquals(new BigDecimal("100.50"), saved.getAmount());
        assertEquals("Test transaction", saved.getDescription());
        assertEquals(Transaction.TransactionType.EXPENSE, saved.getType());
    }

    @Test
    void testFindTransactionsByUser_Success() {
        // Create multiple transactions
        Transaction tx1 = new Transaction();
        tx1.setAmount(new BigDecimal("50.00"));
        tx1.setDescription("Transaction 1");
        tx1.setType(Transaction.TransactionType.EXPENSE);
        tx1.setTransactionDate(LocalDate.now());
        tx1.setIsManual(true);
        tx1.setUser(testUser);
        tx1.setCategory(testCategory);
        transactionRepository.save(tx1);

        Transaction tx2 = new Transaction();
        tx2.setAmount(new BigDecimal("75.00"));
        tx2.setDescription("Transaction 2");
        tx2.setType(Transaction.TransactionType.INCOME);
        tx2.setTransactionDate(LocalDate.now());
        tx2.setIsManual(true);
        tx2.setUser(testUser);
        tx2.setCategory(testCategory);
        transactionRepository.save(tx2);

        List<Transaction> transactions = transactionRepository.findByUserIdOrderByTransactionDateDesc(testUser.getId());

        assertEquals(2, transactions.size());
    }

    @Test
    void testDeleteTransaction_Success() {
        Transaction tx = new Transaction();
        tx.setAmount(new BigDecimal("25.00"));
        tx.setDescription("To be deleted");
        tx.setType(Transaction.TransactionType.EXPENSE);
        tx.setTransactionDate(LocalDate.now());
        tx.setIsManual(true);
        tx.setUser(testUser);
        tx.setCategory(testCategory);
        tx = transactionRepository.save(tx);

        Long txId = tx.getId();
        transactionRepository.deleteById(txId);

        assertFalse(transactionRepository.findById(txId).isPresent());
    }

    // ========== Business Logic Tests ==========

    @Test
    void testPasswordEncoding_Success() {
        String rawPassword = "myPassword123";
        String encoded = passwordEncoder.encode(rawPassword);

        assertNotEquals(rawPassword, encoded);
        assertTrue(passwordEncoder.matches(rawPassword, encoded));
        assertFalse(passwordEncoder.matches("wrongPassword", encoded));
    }

    @Test
    void testTransactionAmountPrecision_Success() {
        Transaction tx = new Transaction();
        tx.setAmount(new BigDecimal("123.456"));
        tx.setDescription("Precision test");
        tx.setType(Transaction.TransactionType.EXPENSE);
        tx.setTransactionDate(LocalDate.now());
        tx.setIsManual(true);
        tx.setUser(testUser);
        tx.setCategory(testCategory);
        
        Transaction saved = transactionRepository.save(tx);

        assertEquals(0, new BigDecimal("123.456").compareTo(saved.getAmount()));
    }

    @Test
    void testCategoryTypes_Success() {
        Category income = new Category();
        income.setName("Salary");
        income.setEmoji("💰");
        income.setType(Category.CategoryType.INCOME);
        income.setUser(testUser);
        categoryRepository.save(income);

        Category expense = new Category();
        expense.setName("Food");
        expense.setEmoji("🍔");
        expense.setType(Category.CategoryType.EXPENSE);
        expense.setUser(testUser);
        categoryRepository.save(expense);

        List<Category> allCategories = categoryRepository.findByUserIdOrIsDefaultTrue(testUser.getId());
        
        long incomeCount = allCategories.stream()
                .filter(c -> c.getType() == Category.CategoryType.INCOME)
                .count();
        long expenseCount = allCategories.stream()
                .filter(c -> c.getType() == Category.CategoryType.EXPENSE)
                .count();

        assertTrue(incomeCount >= 1);
        assertTrue(expenseCount >= 2); // Including the one from setUp
    }
}
