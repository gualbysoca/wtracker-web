const { query } = require('./src/configs/database');
const locationService = require('./src/services/location.service');
const visitService = require('./src/services/visit.service');

async function run() {
  try {
    // 1. Crear un usuario de prueba si no existe
    await query(`
      INSERT INTO users (id, email, password, full_name, role)
      VALUES ('00000000-0000-0000-0000-000000000001', 'test@test.com', 'test', 'Test User', 'vendedor')
      ON CONFLICT DO NOTHING
    `);

    // 2. Crear un cliente de prueba
    await query(`
      INSERT INTO clients (id, business_name, lat, lng)
      VALUES ('00000000-0000-0000-0000-000000000002', 'Test Client', -17.7, -63.1)
      ON CONFLICT DO NOTHING
    `);

    console.log("Creando visita 'en_ruta'...");
    const visit1 = await visitService.createVisit({
      user_id: '00000000-0000-0000-0000-000000000001',
      client_id: '00000000-0000-0000-0000-000000000002',
      status: 'en_ruta',
      lat: -17.7,
      lng: -63.1,
      timestamp: new Date().toISOString()
    });
    console.log("Visit1:", visit1);

    console.log("Actualizando a 'visitado'...");
    const visit2 = await visitService.createVisit({
      user_id: '00000000-0000-0000-0000-000000000001',
      client_id: '00000000-0000-0000-0000-000000000002',
      status: 'visitado',
      lat: -17.7,
      lng: -63.1,
      timestamp: new Date().toISOString()
    });
    console.log("Visit2:", visit2);

    console.log("Probando locations...");
    const count = await locationService.saveLocationBatch('00000000-0000-0000-0000-000000000001', [
      { lat: -17.7, lng: -63.1, timestamp: new Date().toISOString() }
    ]);
    console.log("Locations guardadas:", count);

    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
}

run();
