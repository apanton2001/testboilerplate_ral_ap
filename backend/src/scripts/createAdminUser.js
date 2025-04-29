/**
 * Script to create an admin user in the database
 * Run with: node src/scripts/createAdminUser.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../models');

const createAdminUser = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');

    const User = db.User;
    const Role = db.Role;

    // Find Admin role
    const adminRole = await Role.findOne({ where: { name: 'Admin' } });
    
    if (!adminRole) {
      console.error('Admin role not found. Please run seedRoles.js first.');
      process.exit(1);
    }

    // Admin user details
    const adminUser = {
      email: 'admin@example.com',
      password: 'Admin@123456789', // This will be hashed
      full_name: 'System Administrator'
    };

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(adminUser.password, salt);

    // Create or update admin user
    const [user, created] = await User.findOrCreate({
      where: { email: adminUser.email },
      defaults: {
        email: adminUser.email,
        password_hash,
        full_name: adminUser.full_name
      }
    });

    if (created) {
      console.log(`Admin user created: ${adminUser.email}`);
    } else {
      console.log(`Admin user already exists: ${adminUser.email}`);
      
      // Update password if user exists
      user.password_hash = password_hash;
      await user.save();
      console.log('Admin password updated');
    }

    // Assign Admin role
    await user.addRole(adminRole);
    console.log('Admin role assigned to user');

    console.log('Admin user setup completed successfully.');
    console.log('Email: admin@example.com');
    console.log('Password: Admin@123456789');
    console.log('Please change this password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

// Run the function
createAdminUser();