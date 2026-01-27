import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react'

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingHospital, setEditingHospital] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    notes: '',
  })

  useEffect(() => {
    fetchHospitals()
  }, [])

  const fetchHospitals = async () => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('name')

      if (error) throw error
      setHospitals(data || [])
    } catch (error) {
      console.error('Error fetching hospitals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingHospital) {
        const { error } = await supabase
          .from('hospitals')
          .update(formData)
          .eq('id', editingHospital.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('hospitals')
          .insert([formData])

        if (error) throw error
      }

      setShowModal(false)
      setEditingHospital(null)
      setFormData({ name: '', address: '', city: '', phone: '', email: '', notes: '' })
      fetchHospitals()
    } catch (error) {
      console.error('Error saving hospital:', error)
      alert('Error saving hospital: ' + error.message)
    }
  }

  const handleEdit = (hospital) => {
    setEditingHospital(hospital)
    setFormData({
      name: hospital.name || '',
      address: hospital.address || '',
      city: hospital.city || '',
      phone: hospital.phone || '',
      email: hospital.email || '',
      notes: hospital.notes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this hospital?')) return

    try {
      const { error } = await supabase.from('hospitals').delete().eq('id', id)
      if (error) throw error
      fetchHospitals()
    } catch (error) {
      console.error('Error deleting hospital:', error)
      alert('Error deleting hospital: ' + error.message)
    }
  }

  const openNewModal = () => {
    setEditingHospital(null)
    setFormData({ name: '', address: '', city: '', phone: '', email: '', notes: '' })
    setShowModal(true)
  }

  const filteredHospitals = hospitals.filter(
    (hospital) =>
      hospital.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hospital.city?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-lenmed-navy">Hospitals</h1>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-lenmed-blue text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
        >
          <Plus size={20} />
          Add Hospital
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search hospitals..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-lenmed-grey">Loading...</div>
        ) : filteredHospitals.length === 0 ? (
          <div className="p-8 text-center text-lenmed-grey">
            {searchTerm ? 'No hospitals found matching your search.' : 'No hospitals yet. Add your first hospital!'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">City</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Address</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Phone</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-lenmed-grey">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredHospitals.map((hospital) => (
                <tr key={hospital.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-lenmed-navy">{hospital.name}</td>
                  <td className="px-6 py-4 text-lenmed-grey">{hospital.city || '-'}</td>
                  <td className="px-6 py-4 text-lenmed-grey">{hospital.address || '-'}</td>
                  <td className="px-6 py-4 text-lenmed-grey">{hospital.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(hospital)}
                        className="p-2 text-lenmed-blue hover:bg-lenmed-blue/10 rounded-lg transition-colors"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(hospital.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-lenmed-navy">
                {editingHospital ? 'Edit Hospital' : 'Add Hospital'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-lenmed-grey mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-lenmed-grey mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-lenmed-grey mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-lenmed-grey mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-lenmed-grey mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-lenmed-grey mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-lenmed-navy text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  {editingHospital ? 'Save Changes' : 'Add Hospital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
