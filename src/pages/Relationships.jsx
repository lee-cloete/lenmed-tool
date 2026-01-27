import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, X, Users, Building2 } from 'lucide-react'

export default function Relationships() {
  const [relationships, setRelationships] = useState([])
  const [doctors, setDoctors] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [selectedHospital, setSelectedHospital] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'visual'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [relRes, docRes, hospRes] = await Promise.all([
        supabase
          .from('doctor_hospitals')
          .select(`
            id,
            doctor_id,
            hospital_id,
            doctors (id, name, specialty),
            hospitals (id, name, city)
          `),
        supabase.from('doctors').select('*').order('name'),
        supabase.from('hospitals').select('*').order('name'),
      ])

      if (relRes.error) throw relRes.error
      if (docRes.error) throw docRes.error
      if (hospRes.error) throw hospRes.error

      setRelationships(relRes.data || [])
      setDoctors(docRes.data || [])
      setHospitals(hospRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedDoctor || !selectedHospital) {
      alert('Please select both a doctor and a hospital')
      return
    }

    // Check if relationship already exists
    const exists = relationships.some(
      (r) => r.doctor_id === selectedDoctor && r.hospital_id === selectedHospital
    )

    if (exists) {
      alert('This relationship already exists')
      return
    }

    try {
      const { error } = await supabase.from('doctor_hospitals').insert([
        { doctor_id: selectedDoctor, hospital_id: selectedHospital },
      ])

      if (error) throw error

      setShowModal(false)
      setSelectedDoctor('')
      setSelectedHospital('')
      fetchData()
    } catch (error) {
      console.error('Error creating relationship:', error)
      alert('Error creating relationship: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this relationship?')) return

    try {
      const { error } = await supabase.from('doctor_hospitals').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error deleting relationship:', error)
      alert('Error deleting relationship: ' + error.message)
    }
  }

  // Group relationships by hospital for visual view
  const relationshipsByHospital = hospitals.map((hospital) => ({
    ...hospital,
    doctors: relationships
      .filter((r) => r.hospital_id === hospital.id)
      .map((r) => r.doctors)
      .filter(Boolean),
  }))

  // Group relationships by doctor
  const relationshipsByDoctor = doctors.map((doctor) => ({
    ...doctor,
    hospitals: relationships
      .filter((r) => r.doctor_id === doctor.id)
      .map((r) => r.hospitals)
      .filter(Boolean),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-lenmed-navy">Doctor-Hospital Relationships</h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === 'list' ? 'bg-white shadow text-lenmed-navy' : 'text-lenmed-grey'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === 'visual' ? 'bg-white shadow text-lenmed-navy' : 'text-lenmed-grey'
              }`}
            >
              Visual
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-lenmed-blue text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
          >
            <Plus size={20} />
            Link Doctor
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-lenmed-grey">
          Loading...
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {relationships.length === 0 ? (
            <div className="p-8 text-center text-lenmed-grey">
              No relationships yet. Link a doctor to a hospital to get started!
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Doctor</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Specialty</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">Hospital</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-lenmed-grey">City</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-lenmed-grey">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {relationships.map((rel) => (
                  <tr key={rel.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-lenmed-navy">
                      {rel.doctors?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-lenmed-grey">
                      {rel.doctors?.specialty || '-'}
                    </td>
                    <td className="px-6 py-4 font-medium text-lenmed-blue">
                      {rel.hospitals?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-lenmed-grey">
                      {rel.hospitals?.city || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleDelete(rel.id)}
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
      ) : (
        /* Visual View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Hospital */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-lenmed-navy mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-lenmed-blue" />
              Grouped by Hospital
            </h3>
            <div className="space-y-4">
              {relationshipsByHospital.map((hospital) => (
                <div key={hospital.id} className="border rounded-lg p-4">
                  <h4 className="font-medium text-lenmed-navy">{hospital.name}</h4>
                  <p className="text-sm text-lenmed-grey mb-2">{hospital.city}</p>
                  {hospital.doctors.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {hospital.doctors.map((doctor) => (
                        <span
                          key={doctor.id}
                          className="inline-flex items-center gap-1 bg-lenmed-blue/10 text-lenmed-blue px-3 py-1 rounded-full text-sm"
                        >
                          <Users size={14} />
                          {doctor.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No doctors linked</p>
                  )}
                </div>
              ))}
              {hospitals.length === 0 && (
                <p className="text-lenmed-grey text-center py-4">No hospitals added yet</p>
              )}
            </div>
          </div>

          {/* By Doctor */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-lenmed-navy mb-4 flex items-center gap-2">
              <Users size={20} className="text-lenmed-green" />
              Grouped by Doctor
            </h3>
            <div className="space-y-4">
              {relationshipsByDoctor.map((doctor) => (
                <div key={doctor.id} className="border rounded-lg p-4">
                  <h4 className="font-medium text-lenmed-navy">{doctor.name}</h4>
                  <p className="text-sm text-lenmed-grey mb-2">{doctor.specialty}</p>
                  {doctor.hospitals.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {doctor.hospitals.map((hospital) => (
                        <span
                          key={hospital.id}
                          className="inline-flex items-center gap-1 bg-lenmed-green/10 text-lenmed-green px-3 py-1 rounded-full text-sm"
                        >
                          <Building2 size={14} />
                          {hospital.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No hospitals linked</p>
                  )}
                </div>
              ))}
              {doctors.length === 0 && (
                <p className="text-lenmed-grey text-center py-4">No doctors added yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-lenmed-navy">Link Doctor to Hospital</h2>
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
                  Select Doctor *
                </label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
                  required
                >
                  <option value="">Choose a doctor...</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} {doctor.specialty ? `(${doctor.specialty})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-lenmed-grey mb-1">
                  Select Hospital *
                </label>
                <select
                  value={selectedHospital}
                  onChange={(e) => setSelectedHospital(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lenmed-blue focus:border-transparent outline-none"
                  required
                >
                  <option value="">Choose a hospital...</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name} {hospital.city ? `(${hospital.city})` : ''}
                    </option>
                  ))}
                </select>
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
                  Link Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
