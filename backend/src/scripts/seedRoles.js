/**
 * Seed script to create initial roles in the database
 * Run with: node src/scripts/seedRoles.js
 */

require('dotenv').config();
const db = require('../models');

const seedRoles = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');

    const Role = db.Role;

    // Define roles
    const roles = [
      { name: 'Data Entry Clerk' },
      { name: 'Tariff Reviewer' },
      { name: 'Admin' }
    ];

    // Create roles
    for (const role of roles) {
      const [createdRole, created] = await Role.findOrCreate({
        where: { name: role.name },
        defaults: role
      });

      if (created) {
        console.log(`Role created: ${role.name}`);
      } else {
        console.log(`Role already exists: ${role.name}`);
      }
    }

    console.log('Roles seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding roles:', error);
    process.exit(1);
  }
};

// Run the seed function
seedRoles();