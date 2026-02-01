// Customer Management tests
const validateCustomer = require('../validation/customerValidation');

test('valid customer', () => {
    expect(() => validateCustomer({ name: 'John Doe', email: 'john@example.com' })).not.toThrow();
});

test('invalid customer', () => {
    expect(() => validateCustomer({ name: '', email: '' })).toThrow('Invalid customer data');
});