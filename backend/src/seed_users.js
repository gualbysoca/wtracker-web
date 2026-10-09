const userService = require('./services/user.service');

async function seed() {
  try {
    console.log("Creating System Users...");
    await userService.createUser({
      full_name: 'Admin Sistema',
      email: 'admin2@wtracker.com',
      password: 'Password123',
      role: 'admin',
    });
    await userService.createUser({
      full_name: 'Supervisor General',
      email: 'super@wtracker.com',
      password: 'Password123',
      role: 'supervisor',
    });

    console.log("Creating Mobile Users...");
    await userService.createUser({
      full_name: 'Juan Reponedor',
      email: 'juan@wtracker.com',
      password: 'Password123',
      role: 'reponedor',
      phone: '+56912345678'
    });
    await userService.createUser({
      full_name: 'Maria Vendedora',
      email: 'maria@wtracker.com',
      password: 'Password123',
      role: 'vendedor',
      phone: '+56987654321'
    });
    console.log("Seeding complete.");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding:", err);
    process.exit(1);
  }
}

seed();
