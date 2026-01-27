import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, Building2, Link2 } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    doctors: 0,
    hospitals: 0,
    relationships: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [doctorsRes, hospitalsRes, relationsRes] = await Promise.all([
        supabase.from('doctors').select('id', { count: 'exact', head: true }),
        supabase.from('hospitals').select('id', { count: 'exact', head: true }),
        supabase.from('doctor_hospitals').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        doctors: doctorsRes.count || 0,
        hospitals: hospitalsRes.count || 0,
        relationships: relationsRes.count || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Doctors', value: stats.doctors, icon: Users, color: 'bg-lenmed-blue' },
    { label: 'Hospitals', value: stats.hospitals, icon: Building2, color: 'bg-lenmed-navy' },
    { label: 'Relationships', value: stats.relationships, icon: Link2, color: 'bg-lenmed-green' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-lenmed-navy mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lenmed-grey text-sm">{card.label}</p>
                <p className="text-3xl font-bold text-lenmed-navy mt-1">
                  {loading ? '...' : card.value}
                </p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="text-white" size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-lenmed-navy mb-4">Quick Start Guide</h2>
        <div className="space-y-3 text-lenmed-grey">
          <p>1. Add your hospitals in the <span className="text-lenmed-blue font-medium">Hospitals</span> section</p>
          <p>2. Add your doctors in the <span className="text-lenmed-blue font-medium">Doctors</span> section</p>
          <p>3. Link doctors to hospitals in the <span className="text-lenmed-blue font-medium">Relationships</span> section</p>
          <p>4. View and manage all relationships from the visualization</p>
        </div>
      </div>
    </div>
  )
}
