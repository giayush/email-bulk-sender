const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.log('Usage: node hash_password.js <your_password>');
  process.exit(1);
}

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
  } else {
    console.log('\nYour bcrypt hash is:');
    console.log(hash);
    console.log('\nPaste this into ADMIN_PASSWORD_HASH in your .env file.\n');
  }
});
