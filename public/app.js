// BikeShare SaaS - Frontend principal
// Gestión de la interfaz, consumiendo la API del backend

const API = '/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let currentPage = 'dashboard';

// Utilidades API
async function apiFetch(path, options = {}, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = { method, headers };
  if (body) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${API}${path}`, config);
  if (res.status === 401) {
    logout();
    throw new Error('Sesión expirada');
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error en la solicitud');
  }
  return data;
}

const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, {}, 'POST', body),
  put: (path, body) => apiFetch(path, {}, 'PUT', body),
  del: (path) => apiFetch(path, {}, 'DELETE'),
  patch: (path, body) => apiFetch(path, {}, 'PATCH', body)
};

// Utilidades de UI
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function openModal(html) {
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

function formatMoney(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
}

// Navegación
const pageTitles = {
  dashboard: 'Dashboard',
  bikes: 'Bicicletas',
  stations: 'Estaciones',
  bookings: 'Reservas',
  customers: 'Clientes',
  pricing: 'Tarifas',
  reports: 'Reportes'
};

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.getElementById('pageTitle').textContent = pageTitles[page];
  renderPage(page);
}

// Render de páginas
const renderers = {
  dashboard: renderDashboard,
  bikes: renderBikes,
  stations: renderStations,
  bookings: renderBookings,
  customers: renderCustomers,
  pricing: renderPricing,
  reports: renderReports
};

async function renderPage(page) {
  const content = document.getElementById('pageContent');
  try {
    await renderers[page](content);
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">Error: ${escapeHtml(err.message)}</div>`;
  }
}

// ---------- DASHBOARD ----------
async function renderDashboard(content) {
  const summary = await api.get('/reports/summary');
  const recent = await api.get('/reports/recent-bookings');

  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue"><i class="fas fa-bicycle"></i></div>
        <div class="stat-info"><h3>${summary.totalBikes}</h3><p>Bicicletas totales</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
        <div class="stat-info"><h3>${summary.availableBikes}</h3><p>Disponibles</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red"><i class="fas fa-sign-out-alt"></i></div>
        <div class="stat-info"><h3>${summary.rentedBikes}</h3><p>Alquiladas</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange"><i class="fas fa-tools"></i></div>
        <div class="stat-info"><h3>${summary.inRepair}</h3><p>En reparación</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple"><i class="fas fa-wallet"></i></div>
        <div class="stat-info"><h3>${formatMoney(summary.totalRevenue)}</h3><p>Ingresos totales</p></div>
      </div>
    </div>

    <div class="table-container">
      <h2>Reservas recientes</h2>
      <table>
        <thead>
          <tr>
            <th>N°</th><th>Cliente</th><th>Bicicleta</th><th>Estado</th><th>Inicio</th>
          </tr>
        </thead>
        <tbody>
          ${recent.map(b => `
            <tr>
              <td>${escapeHtml(b.bookingNumber)}</td>
              <td>${escapeHtml(b.customer)}</td>
              <td>${escapeHtml(b.bike)}</td>
              <td><span class="badge-status badge-${b.status}">${b.status}</span></td>
              <td>${formatDate(b.startTime)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ---------- BICICLETAS ----------
async function renderBikes(content) {
  const bikes = await api.get('/bikes');
  const stations = await api.get('/stations');

  content.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" onclick="openBikeForm()"><i class="fas fa-plus"></i> Nueva bicicleta</button>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>N°</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Estación</th><th>Precio/h</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${bikes.map(b => `
            <tr>
              <td>${escapeHtml(b.bikeNumber)}</td>
              <td>${escapeHtml(b.name)}</td>
              <td>${escapeHtml(b.type)}</td>
              <td><span class="badge-status badge-${b.status}">${b.status}</span></td>
              <td>${b.stationId ? escapeHtml(stations.find(s => s.id === b.stationId)?.name || 'N/A') : '—'}</td>
              <td>${formatMoney(b.pricePerHour)}</td>
              <td class="flex gap-10">
                <button class="btn btn-sm btn-primary" onclick="openBikeForm('${b.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteBike('${b.id}')"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function openBikeForm(id = null) {
  const stations = await api.get('/stations');
  let bike = { name: '', bikeNumber: '', type: 'Urbana', pricePerHour: 0, stationId: '' };

  if (id) {
    const bikes = await api.get('/bikes');
    bike = bikes.find(b => b.id === id);
  }

  openModal(`
    <h2>${id ? 'Editar' : 'Nueva'} bicicleta</h2>
    <form onsubmit="saveBike(event, '${id || ''}')">
      <div class="form-group">
        <label>Número</label>
        <input type="text" name="bikeNumber" value="${escapeHtml(bike.bikeNumber)}" required>
      </div>
      <div class="form-group">
        <label>Nombre</label>
        <input type="text" name="name" value="${escapeHtml(bike.name)}" required>
      </div>
      <div class="form-group">
        <label>Tipo</label>
        <select name="type">
          ${['Urbana', 'Montaña', 'Eléctrica', 'Infantil'].map(t =>
            `<option value="${t}" ${bike.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Estación</label>
        <select name="stationId">
          <option value="">— Sin asignar —</option>
          ${stations.map(s =>
            `<option value="${s.id}" ${bike.stationId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Precio por hora ($)</label>
        <input type="number" step="0.1" name="pricePerHour" value="${bike.pricePerHour}" required>
      </div>
      <button type="submit" class="btn btn-success btn-block">Guardar</button>
    </form>
  `);
}

async function saveBike(event, id) {
  event.preventDefault();
  const form = event.target;
  const data = {
    name: form.name.value,
    bikeNumber: form.bikeNumber.value,
    type: form.type.value,
    pricePerHour: parseFloat(form.pricePerHour.value),
    stationId: form.stationId.value || null
  };

  try {
    if (id) {
      await api.put(`/bikes/${id}`, data);
    } else {
      await api.post('/bikes', data);
    }
    closeModal();
    showToast('Bicicleta guardada', 'success');
    renderPage('bikes');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteBike(id) {
  if (!confirm('¿Eliminar esta bicicleta?')) return;
  try {
    await api.del(`/bikes/${id}`);
    showToast('Bicicleta eliminada', 'success');
    renderPage('bikes');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------- ESTACIONES ----------
async function renderStations(content) {
  const stations = await api.get('/stations');

  content.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" onclick="openStationForm()"><i class="fas fa-plus"></i> Nueva estación</button>
    </div>
    <div class="stats-grid">
      ${stations.map(s => `
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fas fa-map-marker-alt"></i></div>
          <div class="stat-info">
            <h3>${s.availableBikes} <small>/ ${s.capacity}</small></h3>
            <p>${escapeHtml(s.name)}</p>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Nombre</th><th>Dirección</th><th>Ciudad</th><th>Capacidad</th><th>Disponibles</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${stations.map(s => `
            <tr>
              <td>${escapeHtml(s.name)}</td>
              <td>${escapeHtml(s.address)}</td>
              <td>${escapeHtml(s.city)}</td>
              <td>${s.capacity}</td>
              <td>${s.availableBikes}</td>
              <td class="flex gap-10">
                <button class="btn btn-sm btn-primary" onclick="openStationForm('${s.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteStation('${s.id}')"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function openStationForm(id = null) {
  let station = { name: '', address: '', city: '', capacity: 10 };
  if (id) {
    const stations = await api.get('/stations');
    station = stations.find(s => s.id === id);
  }

  openModal(`
    <h2>${id ? 'Editar' : 'Nueva'} estación</h2>
    <form onsubmit="saveStation(event, '${id || ''}')">
      <div class="form-group">
        <label>Nombre</label>
        <input type="text" name="name" value="${escapeHtml(station.name)}" required>
      </div>
      <div class="form-group">
        <label>Dirección</label>
        <input type="text" name="address" value="${escapeHtml(station.address)}" required>
      </div>
      <div class="form-group">
        <label>Ciudad</label>
        <input type="text" name="city" value="${escapeHtml(station.city)}" required>
      </div>
      <div class="form-group">
        <label>Capacidad</label>
        <input type="number" name="capacity" value="${station.capacity}" required>
      </div>
      <button type="submit" class="btn btn-success btn-block">Guardar</button>
    </form>
  `);
}

async function saveStation(event, id) {
  event.preventDefault();
  const form = event.target;
  const data = {
    name: form.name.value,
    address: form.address.value,
    city: form.city.value,
    capacity: parseInt(form.capacity.value)
  };

  try {
    if (id) {
      await api.put(`/stations/${id}`, data);
    } else {
      await api.post('/stations', data);
    }
    closeModal();
    showToast('Estación guardada', 'success');
    renderPage('stations');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteStation(id) {
  if (!confirm('¿Eliminar esta estación?')) return;
  try {
    await api.del(`/stations/${id}`);
    showToast('Estación eliminada', 'success');
    renderPage('stations');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------- RESERVAS ----------
async function renderBookings(content) {
  const bookings = await api.get('/bookings');

  content.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" onclick="openBookingForm()"><i class="fas fa-plus"></i> Nueva reserva</button>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>N°</th><th>Cliente</th><th>Bicicleta</th><th>Estado</th><th>Inicio</th><th>Fin</th><th>Total</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(b => `
            <tr>
              <td>${escapeHtml(b.bookingNumber)}</td>
              <td>${escapeHtml(b.customer?.name || 'N/A')}</td>
              <td>${escapeHtml(b.bike?.bikeNumber || 'N/A')}</td>
              <td><span class="badge-status badge-${b.status}">${b.status}</span></td>
              <td>${formatDate(b.startTime)}</td>
              <td>${formatDate(b.endTime)}</td>
              <td>${formatMoney(b.totalPrice)}</td>
              <td class="flex gap-10">
                ${b.status === 'activa' ? `
                  <button class="btn btn-sm btn-success" onclick="returnBike('${b.id}')"><i class="fas fa-undo"></i></button>
                  <button class="btn btn-sm btn-warning" onclick="cancelBooking('${b.id}')"><i class="fas fa-ban"></i></button>
                ` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function openBookingForm() {
  const customers = await api.get('/customers');
  const bikes = await api.get('/bikes');
  const stations = await api.get('/stations');
  const availableBikes = bikes.filter(b => b.status === 'disponible');

  if (availableBikes.length === 0) {
    showToast('No hay bicicletas disponibles', 'error');
    return;
  }

  openModal(`
    <h2>Nueva reserva</h2>
    <form onsubmit="saveBooking(event)">
      <div class="form-group">
        <label>Cliente</label>
        <select name="customerId" required>
          ${customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Bicicleta</label>
        <select name="bikeId" required>
          ${availableBikes.map(b => `<option value="${b.id}">${escapeHtml(b.bikeNumber)} - ${escapeHtml(b.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Estación de salida</label>
        <select name="startStationId" required>
          ${stations.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
        </select>
      </div>
      <button type="submit" class="btn btn-success btn-block">Crear reserva</button>
    </form>
  `);
}

async function saveBooking(event) {
  event.preventDefault();
  const form = event.target;
  const data = {
    customerId: form.customerId.value,
    bikeId: form.bikeId.value,
    startStationId: form.startStationId.value
  };

  try {
    await api.post('/bookings', data);
    closeModal();
    showToast('Reserva creada', 'success');
    renderPage('bookings');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function returnBike(id) {
  const stations = await api.get('/stations');
  openModal(`
    <h2>Devolver bicicleta</h2>
    <form onsubmit="saveReturn(event, '${id}')">
      <div class="form-group">
        <label>Estación de devolución</label>
        <select name="endStationId" required>
          ${stations.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
        </select>
      </div>
      <button type="submit" class="btn btn-success btn-block">Completar</button>
    </form>
  `);
}

async function saveReturn(event, id) {
  event.preventDefault();
  const data = { endStationId: event.target.endStationId.value };
  try {
    const result = await api.post(`/bookings/${id}/return`, data);
    closeModal();
    showToast(`Reserva completada. Total: ${formatMoney(result.totalPrice)}`, 'success');
    renderPage('bookings');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function cancelBooking(id) {
  if (!confirm('¿Cancelar esta reserva?')) return;
  try {
    await api.post(`/bookings/${id}/cancel`, {});
    showToast('Reserva cancelada', 'success');
    renderPage('bookings');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------- CLIENTES ----------
async function renderCustomers(content) {
  const customers = await api.get('/customers');

  content.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" onclick="openCustomerForm()"><i class="fas fa-plus"></i> Nuevo cliente</button>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Nombre</th><th>Email</th><th>Teléfono</th><th>DNI</th><th>Reservas</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map(c => `
            <tr>
              <td>${escapeHtml(c.name)}</td>
              <td>${escapeHtml(c.email)}</td>
              <td>${escapeHtml(c.phone)}</td>
              <td>${escapeHtml(c.idCard)}</td>
              <td>${c.totalBookings}</td>
              <td class="flex gap-10">
                <button class="btn btn-sm btn-primary" onclick="openCustomerForm('${c.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${c.id}')"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function openCustomerForm(id = null) {
  let customer = { name: '', email: '', phone: '', idCard: '' };
  if (id) {
    const customers = await api.get('/customers');
    customer = customers.find(c => c.id === id);
  }

  openModal(`
    <h2>${id ? 'Editar' : 'Nuevo'} cliente</h2>
    <form onsubmit="saveCustomer(event, '${id || ''}')">
      <div class="form-group">
        <label>Nombre</label>
        <input type="text" name="name" value="${escapeHtml(customer.name)}" required>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" value="${escapeHtml(customer.email)}" required>
      </div>
      <div class="form-group">
        <label>Teléfono</label>
        <input type="text" name="phone" value="${escapeHtml(customer.phone)}">
      </div>
      <div class="form-group">
        <label>DNI</label>
        <input type="text" name="idCard" value="${escapeHtml(customer.idCard)}">
      </div>
      <button type="submit" class="btn btn-success btn-block">Guardar</button>
    </form>
  `);
}

async function saveCustomer(event, id) {
  event.preventDefault();
  const form = event.target;
  const data = {
    name: form.name.value,
    email: form.email.value,
    phone: form.phone.value,
    idCard: form.idCard.value
  };

  try {
    if (id) {
      await api.put(`/customers/${id}`, data);
    } else {
      await api.post('/customers', data);
    }
    closeModal();
    showToast('Cliente guardado', 'success');
    renderPage('customers');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCustomer(id) {
  if (!confirm('¿Eliminar este cliente?')) return;
  try {
    await api.del(`/customers/${id}`);
    showToast('Cliente eliminado', 'success');
    renderPage('customers');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------- TARIFAS ----------
async function renderPricing(content) {
  const pricing = await api.get('/pricing');

  content.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" onclick="openPricingForm()"><i class="fas fa-plus"></i> Nueva tarifa</button>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Tipo</th><th>Precio/hora</th><th>Precio/día</th><th>Extras</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${pricing.map(p => `
            <tr>
              <td>${escapeHtml(p.bikeType)}</td>
              <td>${formatMoney(p.pricePerHour)}</td>
              <td>${p.pricePerDay ? formatMoney(p.pricePerDay) : '—'}</td>
              <td>${formatMoney(p.extraHour)}</td>
              <td class="flex gap-10">
                <button class="btn btn-sm btn-primary" onclick="openPricingForm('${p.id}')"><i class="fas fa-edit"></i></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function openPricingForm(id = null) {
  let price = { bikeType: 'Urbana', pricePerHour: 2.5, pricePerDay: 15, extraHour: 1 };
  if (id) {
    const pricing = await api.get('/pricing');
    price = pricing.find(p => p.id === id);
  }

  openModal(`
    <h2>${id ? 'Editar' : 'Nueva'} tarifa</h2>
    <form onsubmit="savePricing(event, '${id || ''}')">
      <div class="form-group">
        <label>Tipo de bicicleta</label>
        <input type="text" name="bikeType" value="${escapeHtml(price.bikeType)}" required>
      </div>
      <div class="form-group">
        <label>Precio por hora ($)</label>
        <input type="number" step="0.1" name="pricePerHour" value="${price.pricePerHour}" required>
      </div>
      <div class="form-group">
        <label>Precio por día ($)</label>
        <input type="number" step="0.1" name="pricePerDay" value="${price.pricePerDay || ''}">
      </div>
      <div class="form-group">
        <label>Tarifa extra/hora ($)</label>
        <input type="number" step="0.1" name="extraHour" value="${price.extraHour}">
      </div>
      <button type="submit" class="btn btn-success btn-block">Guardar</button>
    </form>
  `);
}

async function savePricing(event, id) {
  event.preventDefault();
  const form = event.target;
  const data = {
    bikeType: form.bikeType.value,
    pricePerHour: parseFloat(form.pricePerHour.value),
    pricePerDay: form.pricePerDay.value ? parseFloat(form.pricePerDay.value) : null,
    extraHour: parseFloat(form.extraHour.value || 0)
  };

  try {
    if (id) {
      await api.put(`/pricing/${id}`, data);
    } else {
      await api.post('/pricing', data);
    }
    closeModal();
    showToast('Tarifa guardada', 'success');
    renderPage('pricing');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------- REPORTES ----------
async function renderReports(content) {
  const revenueByType = await api.get('/reports/revenue-by-type');
  const stationUtil = await api.get('/reports/station-utilization');
  const avgDuration = await api.get('/reports/avg-duration');

  const revenueEntries = Object.entries(revenueByType);
  const maxRevenue = Math.max(...revenueEntries.map(([, v]) => v), 0);

  content.innerHTML = `
    <div class="toolbar">
      <h2>Utilización de estaciones</h2>
    </div>
    <div class="stats-grid">
      ${avgDuration.count > 0 ? `
        <div class="stat-card">
          <div class="stat-icon purple"><i class="fas fa-clock"></i></div>
          <div class="stat-info"><h3>${avgDuration.averageMinutes} min</h3><p>Duración promedio</p></div>
        </div>
      ` : ''}
    </div>
    <div class="stats-grid">
      ${stationUtil.map(s => `
        <div class="stat-card">
          <div class="stat-icon ${s.utilization > 80 ? 'red' : s.utilization > 50 ? 'orange' : 'green'}"><i class="fas fa-map-marker-alt"></i></div>
          <div class="stat-info">
            <h3>${s.utilization}%</h3>
            <p>${escapeHtml(s.name)} (${s.currentBikes}/${s.capacity})</p>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="table-container">
      <h2>Ingresos por tipo de bicicleta</h2>
      <table>
        <thead>
          <tr><th>Tipo</th><th>Ingresos</th><th>&nbsp;</th></tr>
        </thead>
        <tbody>
          ${revenueEntries.length ? revenueEntries.map(([type, amount]) => `
            <tr>
              <td>${escapeHtml(type)}</td>
              <td>${formatMoney(amount)}</td>
              <td>
                <div style="background:#eee;border-radius:5px;height:20px;width:300px;">
                  <div style="background:var(--primary);height:100%;border-radius:5px;width:${maxRevenue ? (amount/maxRevenue)*100 : 0}%;"></div>
                </div>
              </td>
            </tr>
          `).join('') : '<tr><td colspan="3" class="text-center">Sin datos de ingresos aún</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// ---------- AUTENTICACIÓN ----------
function login(event) {
  event.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) {
        document.getElementById('loginError').textContent = data.error;
        document.getElementById('loginError').classList.remove('hidden');
        return;
      }
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(currentUser));
      enterApp();
    })
    .catch(err => {
      document.getElementById('loginError').textContent = 'Error de conexión';
      document.getElementById('loginError').classList.remove('hidden');
    });
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
}

function enterApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userRole').textContent = currentUser.role;
  navigateTo('dashboard');
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', login);
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Navegación
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.page);
    });
  });

  // Cerrar modal al hacer clic fuera
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal')) closeModal();
  });

  if (token && currentUser) {
    enterApp();
  }
});
