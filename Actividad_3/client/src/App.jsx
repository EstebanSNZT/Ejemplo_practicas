import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

function normalizeUser(row) {
  if (!row) return null

  if (Array.isArray(row)) {
    const [id, nombre, correo] = row
    return { id, nombre, correo }
  }

  return {
    id: row.id ?? row.ID,
    nombre: row.nombre ?? row.NOMBRE,
    correo: row.correo ?? row.CORREO,
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message = typeof data === 'string' ? data : 'No se pudo completar la solicitud.'
    throw new Error(message)
  }

  return data
}

function App() {
  const [users, setUsers] = useState([])
  const [formData, setFormData] = useState({ nombre: '', correo: '' })
  const [searchId, setSearchId] = useState('')
  const [deleteId, setDeleteId] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [feedback, setFeedback] = useState({
    type: 'info',
    text: 'Conecta el servidor y presiona "Actualizar lista" para ver los datos.',
  })

  const totalUsers = useMemo(() => users.length, [users])

  useEffect(() => {
    fetchUsers()
  }, [])

  const setStatus = (type, text) => {
    setFeedback({ type, text })
  }

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const rows = await apiRequest('/usuarios')
      const normalizedUsers = Array.isArray(rows)
        ? rows.map(normalizeUser).filter(Boolean)
        : []
      setUsers(normalizedUsers)
      setStatus('success', `Lista actualizada: ${normalizedUsers.length} usuario(s).`)
    } catch (error) {
      setStatus('error', `No se pudo obtener usuarios: ${error.message}`)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleSetup = async () => {
    setIsWorking(true)
    try {
      const message = await apiRequest('/setup', { method: 'POST' })
      setStatus('success', typeof message === 'string' ? message : 'Tabla creada correctamente.')
      await fetchUsers()
    } catch (error) {
      setStatus('error', `No se pudo ejecutar setup: ${error.message}`)
    } finally {
      setIsWorking(false)
    }
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()

    const nombre = formData.nombre.trim()
    const correo = formData.correo.trim()

    if (!nombre || !correo) {
      setStatus('error', 'Debes completar nombre y correo antes de crear un usuario.')
      return
    }

    setIsWorking(true)
    try {
      await apiRequest('/usuarios', {
        method: 'POST',
        body: JSON.stringify({ nombre, correo }),
      })
      setFormData({ nombre: '', correo: '' })
      setStatus('success', `Usuario "${nombre}" creado con exito.`)
      await fetchUsers()
    } catch (error) {
      setStatus('error', `No se pudo crear el usuario: ${error.message}`)
    } finally {
      setIsWorking(false)
    }
  }

  const handleSearchUser = async (event) => {
    event.preventDefault()

    if (!searchId.trim()) {
      setStatus('error', 'Ingresa un ID para realizar la busqueda.')
      return
    }

    setIsWorking(true)
    try {
      const rows = await apiRequest(`/usuarios/${encodeURIComponent(searchId.trim())}`)
      const foundUser = Array.isArray(rows) && rows.length > 0 ? normalizeUser(rows[0]) : null

      setSelectedUser(foundUser)

      if (!foundUser) {
        setStatus('info', `No se encontro un usuario con ID ${searchId.trim()}.`)
      } else {
        setStatus('success', `Usuario encontrado: ${foundUser.nombre || 'Sin nombre'}.`)
      }
    } catch (error) {
      setSelectedUser(null)
      setStatus('error', `Error al buscar por ID: ${error.message}`)
    } finally {
      setIsWorking(false)
    }
  }

  const deleteUser = async (id) => {
    if (!id && id !== 0) {
      setStatus('error', 'Debes indicar un ID valido para eliminar.')
      return
    }

    setIsWorking(true)
    try {
      await apiRequest(`/usuarios/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
      })

      setStatus('success', `Usuario con ID ${id} eliminado.`)
      setSelectedUser((prev) => (String(prev?.id) === String(id) ? null : prev))
      await fetchUsers()
    } catch (error) {
      setStatus('error', `No se pudo eliminar el usuario: ${error.message}`)
    } finally {
      setIsWorking(false)
    }
  }

  const handleDeleteById = async (event) => {
    event.preventDefault()

    const normalizedId = deleteId.trim()
    if (!normalizedId) {
      setStatus('error', 'Ingresa un ID para eliminar.')
      return
    }

    await deleteUser(normalizedId)
    setDeleteId('')
  }

  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <main className="app">
        <section className="hero reveal">
          <p className="eyebrow">Express + Oracle DB</p>
          <h1>Panel de Gestion de Usuarios</h1>
          <p className="hero-copy">
            Interfaz web para crear tabla, registrar usuarios, consultar por ID y eliminar
            registros usando tus endpoints del servidor.
          </p>

          <div className="hero-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleSetup}
              disabled={isWorking}
            >
              Crear tabla (setup)
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={fetchUsers}
              disabled={isLoadingUsers}
            >
              {isLoadingUsers ? 'Actualizando...' : 'Actualizar lista'}
            </button>
          </div>

          <div className="hero-metrics">
            <div className="metric">
              <span>Total de usuarios</span>
              <strong>{totalUsers}</strong>
            </div>
            <div className="metric">
              <span>Estado API</span>
              <strong>{isWorking || isLoadingUsers ? 'Procesando' : 'Listo'}</strong>
            </div>
          </div>
        </section>

        <div className={`feedback feedback-${feedback.type}`} role="status">
          {feedback.text}
        </div>

        <section className="cards-grid">
          <article className="panel reveal" style={{ '--delay': '80ms' }}>
            <h2>Crear Usuario</h2>
            <form onSubmit={handleCreateUser} className="form-grid">
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Ej: Ana Torres"
                value={formData.nombre}
                onChange={handleInputChange}
              />

              <label htmlFor="correo">Correo</label>
              <input
                id="correo"
                name="correo"
                type="email"
                placeholder="ana@correo.com"
                value={formData.correo}
                onChange={handleInputChange}
              />

              <button className="btn btn-primary" type="submit" disabled={isWorking}>
                Guardar usuario
              </button>
            </form>
          </article>

          <article className="panel reveal" style={{ '--delay': '140ms' }}>
            <h2>Buscar Por ID</h2>
            <form onSubmit={handleSearchUser} className="form-grid">
              <label htmlFor="search-id">ID</label>
              <input
                id="search-id"
                type="number"
                min="1"
                placeholder="Ej: 1"
                value={searchId}
                onChange={(event) => setSearchId(event.target.value)}
              />
              <button className="btn btn-secondary" type="submit" disabled={isWorking}>
                Buscar usuario
              </button>
            </form>

            {selectedUser && (
              <div className="found-user">
                <p>
                  <strong>ID:</strong> {selectedUser.id}
                </p>
                <p>
                  <strong>Nombre:</strong> {selectedUser.nombre || 'Sin nombre'}
                </p>
                <p>
                  <strong>Correo:</strong> {selectedUser.correo || 'Sin correo'}
                </p>
              </div>
            )}
          </article>

          <article className="panel reveal" style={{ '--delay': '200ms' }}>
            <h2>Eliminar Por ID</h2>
            <form onSubmit={handleDeleteById} className="form-grid">
              <label htmlFor="delete-id">ID</label>
              <input
                id="delete-id"
                type="number"
                min="1"
                placeholder="Ej: 3"
                value={deleteId}
                onChange={(event) => setDeleteId(event.target.value)}
              />
              <button className="btn btn-danger" type="submit" disabled={isWorking}>
                Eliminar usuario
              </button>
            </form>
          </article>
        </section>

        <section className="panel table-panel reveal" style={{ '--delay': '260ms' }}>
          <div className="panel-head">
            <h2>Listado Completo</h2>
            <span>{users.length} resultado(s)</span>
          </div>

          {isLoadingUsers ? (
            <p className="empty-state">Cargando usuarios...</p>
          ) : users.length === 0 ? (
            <p className="empty-state">No hay usuarios registrados todavia.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={`${user.id}-${user.correo}`}>
                      <td>{user.id}</td>
                      <td>{user.nombre || 'Sin nombre'}</td>
                      <td>{user.correo || 'Sin correo'}</td>
                      <td>
                        <button
                          className="btn btn-inline"
                          type="button"
                          onClick={() => deleteUser(user.id)}
                          disabled={isWorking}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
