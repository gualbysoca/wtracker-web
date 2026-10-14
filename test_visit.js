

const API_URL = 'http://localhost:3001/api/v1';

async function testMobileVisits() {
  console.log('1. Iniciando sesión como juan.perez@wtracker.com...');
  
  const loginRes = await fetch(`${API_URL}/auth/mobile/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'juan.perez@wtracker.com', password: 'Admin@1234' })
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    console.error('Error de login:', loginData);
    return;
  }

  const token = loginData.data.accessToken;
  console.log('Login exitoso. Token obtenido.');

  console.log('\n2. Obteniendo clientes para la visita...');
  const clientsRes = await fetch(`${API_URL}/mobile/clients`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const clientsData = await clientsRes.json();
  if (!clientsRes.ok || clientsData.data.length === 0) {
    console.error('Error obteniendo clientes:', clientsData);
    return;
  }
  
  const client = clientsData.data[0];
  console.log(`Cliente seleccionado: ${client.business_name} (${client.id})`);

  console.log('\n3. Registrando nueva visita en_ruta...');
  const createRes = await fetch(`${API_URL}/mobile/visits`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: client.id,
      status: 'en_ruta',
      lat: client.lat - 0.001, // un poco lejos
      lng: client.lng - 0.001,
      notes: 'Test: iniciando ruta'
    })
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    console.error('Error creando visita:', createData);
    return;
  }
  console.log('Visita en_ruta registrada:', createData.data.id);

  console.log('\n4. Actualizando estado de la visita a visitado...');
  const updateRes = await fetch(`${API_URL}/mobile/visits`, {
    method: 'POST', // el API siempre usa POST, la base de datos detecta si ya hay en_ruta y lo actualiza
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: client.id,
      status: 'visitado',
      lat: parseFloat(client.lat), 
      lng: parseFloat(client.lng),
      notes: 'Test: finalizado exitosamente'
    })
  });

  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    console.error('Error actualizando visita:', updateData);
    return;
  }
  console.log('Visita actualizada correctamente:', updateData.data);
  console.log('\n¡La API de visitas móviles funciona perfectamente!');
}

testMobileVisits().catch(console.error);
