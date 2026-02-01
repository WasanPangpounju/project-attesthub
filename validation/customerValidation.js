// Customer Management validation logic
function validateCustomer(customer) {
    if (!customer.name || !customer.email) {
        throw new Error('Invalid customer data');
    }
    // additional validation logic here
}

module.exports = validateCustomer;