const mysql = require('mysql2');
const { processPayment } = require('./paymentService');

// Function to log memory usage
function logMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    console.debug('Memory Usage:', {
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`
    });
}

console.debug('Database connection configuration initialized.');
logMemoryUsage();

// Create a connection to the database
const connection = mysql.createConnection({
    host: 'localhost', // Replace with your database host
    user: 'root',      // Replace with your database username
    password: 'password', // Replace with your database password
    database: 'example_db' // Replace with your database name
});

// Connect to the database
connection.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database.');
    console.debug('Connection established successfully.');
    logMemoryUsage();

    // Query the database
    const query = 'SELECT * FROM example_table'; // Replace with your table name
    console.debug('Executing query:', query);
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return;
        }
        console.log('Query results:', results);
        console.debug('Query executed successfully. Results:', results);
        logMemoryUsage();

        // Close the connection
        connection.end(err => {
            if (err) {
                console.error('Error closing the connection:', err);
                return;
            }
            console.debug('Database connection closed successfully.');
            logMemoryUsage();
        });
    });
});

// Example usage of the payment processing function
async function handlePayment() {
    try {
        const paymentMethodId = 'pm_card_visa'; // Replace with actual payment method ID from the client
        const amount = 5000; // Amount in cents ($50.00)
        const currency = 'usd';

        console.debug('Initiating payment...');
        const paymentResult = await processPayment(paymentMethodId, amount, currency);
        console.log('Payment result:', paymentResult);
    } catch (error) {
        console.error('Failed to process payment:', error);
    }
}

// Call the payment handler (for demonstration purposes)
handlePayment();
