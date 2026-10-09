// src/pages/Users/UsersPage.tsx

import { useEffect, useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { UserPlus, Search, Monitor, Smartphone, X, Edit2, Trash2 } from 'lucide-react';
import { userService } from '../../services/user.service';
import type { User, UserRole } from '../../types';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import { useAuthStore } from '../../store/authStore';
import { Skeleton } from '../../components/ui/Skeleton';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  reponedor:  { label: 'Reponedor',  color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  vendedor:   { label: 'Vendedor',   color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  cobrador:   { label: 'Cobrador',   color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  repartidor: { label: 'Repartidor', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  supervisor: { label: 'Supervisor', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  admin:      { label: 'Admin',      color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador', supervisor: 'Supervisor',
  reponedor: 'Reponedor', vendedor: 'Vendedor', cobrador: 'Cobrador', repartidor: 'Repartidor'
};

const SYSTEM_ROLES = ['admin', 'supervisor'];
const MOBILE_ROLES = ['reponedor', 'vendedor', 'cobrador', 'repartidor'];

export const UsersPage = () => {
  const { user: currentUser } = useAuthStore();
  const [users,   setUsers]   = useState<User[]>([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sistema' | 'movil'>(
    currentUser?.role === 'supervisor' ? 'movil' : 'sistema'
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'reponedor' as UserRole,
    phone: ''
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list({ search, limit: 100, include_inactive: true });
      setUsers(res.data);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const filteredUsers = users.filter(user => {
    const matchesRole = activeTab === 'sistema' ? SYSTEM_ROLES.includes(user.role) : MOBILE_ROLES.includes(user.role);
    const matchesSearch = user.full_name.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormErrors({});
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role: (activeTab === 'sistema' ? 'supervisor' : 'reponedor') as UserRole,
      phone: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingId(user.id);
    setFormErrors({});
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '', // Solo si va a cambiar
      role: user.role,
      phone: user.phone || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      await userService.deactivate(id);
      toast.success('Usuario eliminado');
      fetchUsers();
    } catch (error) {
      toast.error('Error al eliminar el usuario');
    }
  };
  const handleToggleStatus = async (user: User) => {
    try {
      await userService.update(user.id, { is_active: !user.is_active });
      toast.success(`Usuario ${user.is_active ? 'desactivado' : 'activado'} correctamente`);
      fetchUsers();
    } catch (error) {
      toast.error('Error al cambiar el estado del usuario');
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setFormErrors({});
    try {
      if (formData.phone && !isValidPhoneNumber(formData.phone)) {
        setFormErrors({ phone: ['El número de teléfono ingresado no es válido'] });
        toast.error('Por favor, ingresa un número de teléfono válido');
        setIsCreating(false);
        return;
      }

      if (editingId) {
        const payload = { ...formData };
        if (!payload.password) {
          delete (payload as any).password;
        }
        await userService.update(editingId, payload);
        toast.success('Usuario actualizado exitosamente');
      } else {
        await userService.create(formData);
        toast.success('Usuario creado exitosamente');
      }
      setIsModalOpen(false);
      fetchUsers(); // Recargar la lista
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string; errors?: Record<string, string[]> }>;
      if (axiosError.response?.data?.errors) {
        setFormErrors(axiosError.response.data.errors);
        toast.error('Por favor, corrige los errores en el formulario');
      } else {
        toast.error(axiosError.response?.data?.message || 'Error al guardar el usuario');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Gestión de Usuarios</h1>
          <p>Administra perfiles del sistema y personal móvil en terreno</p>
        </div>
        <button className="btn btn-primary" id="create-user-btn" onClick={handleOpenCreate}>
          <UserPlus size={16} />
          Nuevo Usuario
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-group" style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', marginBottom: '1.5rem', padding: '0 1rem' }}>
        {currentUser?.role !== 'supervisor' && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'sistema' ? 'active' : ''}`}
            onClick={() => setActiveTab('sistema')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Monitor size={16} />
            Usuarios del Sistema
          </button>
        )}
        <button
          type="button"
          className={`tab-btn ${activeTab === 'movil' ? 'active' : ''}`}
          onClick={() => setActiveTab('movil')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Smartphone size={16} />
          Personal Móvil
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <Search size={16} className="search-bar-icon" />
            <input
              id="users-search"
              type="text"
              className="form-input"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select" style={{ width: 'auto' }} id="users-role-filter">
            <option value="">Todos los roles ({activeTab === 'sistema' ? 'Sistema' : 'Móvil'})</option>
            {Object.entries(ROLE_LABELS)
              .filter(([v]) => (activeTab === 'sistema' ? SYSTEM_ROLES.includes(v) : MOBILE_ROLES.includes(v)))
              .map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 300px)' }}>
        <div className="table-wrapper" style={{ border: 'none', flex: 1, overflowY: 'auto' }}>
          <table className="table" id="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                {activeTab === 'movil' && <th>Teléfono</th>}
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Skeleton width="60%" height="1rem" />
                        <Skeleton width="40%" height="0.8rem" />
                      </div>
                    </td>
                    <td><Skeleton width="80px" /></td>
                    <td><Skeleton width="60px" /></td>
                    {activeTab === 'movil' && <td><Skeleton width="100px" /></td>}
                    <td><Skeleton width="120px" /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Skeleton width="32px" height="32px" />
                        <Skeleton width="32px" height="32px" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'movil' ? 5 : 3}>
                    <div className="empty-state">
                      <UserPlus size={48} className="empty-state-icon" />
                      <div className="empty-state-title">No hay usuarios</div>
                      <div className="empty-state-desc">No se encontraron usuarios en esta sección</div>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
                        {user.full_name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{user.full_name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const roleInfo = ROLE_CONFIG[user.role?.toLowerCase()] ?? {
                        label: ROLE_LABELS[user.role] || user.role,
                        color: 'var(--text-muted)',
                        bg: 'var(--surface-hover)',
                      };
                      return (
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.55rem',
                            borderRadius: 'var(--radius-full)',
                            color: roleInfo.color,
                            backgroundColor: roleInfo.bg,
                            border: `1px solid ${roleInfo.color}40`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {roleInfo.label}
                        </span>
                      );
                    })()}
                  </td>
                  {activeTab === 'movil' && (
                    <td style={{ fontSize: '0.875rem' }}>{user.phone ?? '—'}</td>
                  )}
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="checkbox" 
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                          checked={user.is_active}
                          onChange={() => handleToggleStatus(user)}
                        />
                        <div style={{
                          width: '36px',
                          height: '20px',
                          backgroundColor: user.is_active ? 'var(--color-success)' : 'var(--surface-border)',
                          borderRadius: '10px',
                          transition: 'background-color 0.2s',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: user.is_active ? '18px' : '2px',
                            transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: user.is_active ? 'var(--color-success)' : 'var(--text-muted)', fontWeight: 500 }}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </label>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Editar" onClick={() => handleOpenEdit(user)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Eliminar" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(user.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Usuario */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div>
                <div className="card-title">{editingId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</div>
                <div className="card-subtitle">
                  {editingId ? 'Editando información del usuario' : 'Añadiendo un nuevo usuario a la plataforma'}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setIsModalOpen(false)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {activeTab === 'sistema' ? (
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label required">Nombre Completo</label>
                    <input type="text" className={`form-input ${formErrors.full_name ? 'error' : ''}`} value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Ej. Juan Pérez" required />
                    {formErrors.full_name && <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.full_name[0]}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Email</label>
                    <input type="email" className={`form-input ${formErrors.email ? 'error' : ''}`} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="juan@wtracker.com" required />
                    {formErrors.email && <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.email[0]}</div>}
                  </div>
                  <div className="form-group">
                    <label className={`form-label ${editingId ? '' : 'required'}`}>Contraseña {editingId ? '(Dejar en blanco para no cambiar)' : 'Temporal'}</label>
                    <input type="text" className={`form-input ${formErrors.password ? 'error' : ''}`} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número" required={!editingId} />
                    {formErrors.password && <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.password[0]}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Rol del Sistema</label>
                    <select className={`form-select ${formErrors.role ? 'error' : ''}`} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} required>
                      {Object.entries(ROLE_LABELS).filter(([v]) => SYSTEM_ROLES.includes(v)).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    {formErrors.role && <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.role[0]}</div>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={isCreating}>{isCreating ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Crear Usuario')}</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label required">Nombre Completo</label>
                    <input type="text" className={`form-input ${formErrors.full_name ? 'error' : ''}`} value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Ej. Juan Pérez" required />
                    {formErrors.full_name && <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.full_name[0]}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Email</label>
                    <input type="email" className={`form-input ${formErrors.email ? 'error' : ''}`} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="juan@wtracker.com" required />
                    {formErrors.email && <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.email[0]}</div>}
                  </div>
                  <div className="form-group">
                    <label className={`form-label ${editingId ? '' : 'required'}`}>Contraseña {editingId ? '(Dejar en blanco para no cambiar)' : 'Temporal'}</label>
                    <input type="text" className={`form-input ${formErrors.password ? 'error' : ''}`} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número" required={!editingId} />
                    {formErrors.password && <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.password[0]}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Rol Móvil</label>
                    <select className={`form-select ${formErrors.role ? 'error' : ''}`} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} required>
                      {Object.entries(ROLE_LABELS).filter(([v]) => MOBILE_ROLES.includes(v)).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    {formErrors.role && <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.role[0]}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <div className={`form-input phone-input-container ${formErrors.phone || (formData.phone && !isValidPhoneNumber(formData.phone)) ? 'error' : ''}`}>
                      <PhoneInput
                        international
                        defaultCountry="BO"
                        value={formData.phone}
                        onChange={(val) => setFormData({ ...formData, phone: val || '' })}
                        placeholder="+591 71234567"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                    {formErrors.phone && <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{formErrors.phone[0]}</div>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={isCreating}>{isCreating ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Crear Usuario')}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
