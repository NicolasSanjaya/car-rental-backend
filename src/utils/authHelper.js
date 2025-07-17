const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password) => password && password.length >= 6;

module.exports = { isValidEmail, isValidPassword };
