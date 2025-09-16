import React from 'react';
import EditableTable from './components/EditableTable';
import { CsvTypeSelector } from './components/CsvTypeSelector';
import { api, CsvKind, DataResponse, ValidationResult } from './api';
function useTableState(initial: string[][]) {
  const [rows, setRows] = React.useState<string[][]>(initial)
  return { rows, setRows }
}
export default function App() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [stringsHeaders, setStringsHeaders] = React.useState<string[]>([])
  const [classHeaders, setClassHeaders] = React.useState<string[]>([])
  const [validation, setValidation] = React.useState<ValidationResult | null>(null)
  const [activeTab, setActiveTab] = React.useState<'strings' | 'classifications' | null>(null)
  
  const strings = useTableState([])
  const classifications = useTableState([])
  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const data: DataResponse = await api.getData()
      setStringsHeaders(data.strings.headers)
      strings.setRows(data.strings.rows)
      setClassHeaders(data.classifications.headers)
      classifications.setRows(data.classifications.rows)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }
  React.useEffect(() => {
    refresh()
  }, [])
  const onUpload = async (file: File, type: CsvKind | 'auto' = 'auto') => {
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error?.error || 'Upload failed')
      }
      
      const data = await res.json()
      
      if (data.type === 'strings') {
        setStringsHeaders(data.headers)
        strings.setRows(data.rows)
        setActiveTab('strings')
      } else if (data.type === 'classifications') {
        setClassHeaders(data.headers)
        classifications.setRows(data.rows)
        setActiveTab('classifications')
      }
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    }
  }
  const handleFileSelect = async (file: File) => {
    await onUpload(file, 'auto');
  }
  const save = async (type: CsvKind) => {
    setError(null)
    try {
      const rows = type === 'strings' ? strings.rows : classifications.rows
      const res = await api.save(type, rows)
      if (res?.ok && type === 'strings') {
        await runValidation()
      }
    } catch (e: any) {
      if (e?.validation) {
        setValidation(e.validation)
        setError('Validation failed. See highlighted rows.')
      } else {
        setError(e?.message ?? 'Save failed')
      }
    }
  }
  const runValidation = async () => {
    try {
      const result = await api.validate(strings.rows)
      setValidation(result)
    } catch (e: any) {
      setError(e?.message ?? 'Validation failed')
    }
  }
  const exportCsv = async (type: CsvKind) => {
    try {
      await api.exportCsv(type)
    } catch (e: any) {
      setError(e?.message ?? 'Export failed')
    }
  }
  const invalidIndices = validation?.invalidIndices ?? []
  // Function to render the content for a specific tab
  const renderTabContent = (type: 'strings' | 'classifications') => {
    if (type === 'classifications') {
      return (
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="toolbar">
              <button className="btn" onClick={() => save('classifications')}>
                Save classifications
              </button>
              <button 
                className="btn secondary" 
                onClick={() => exportCsv('classifications')}
              >
                Export classifications
              </button>
            </div>
          </div>
          <EditableTable
            title="classifications"
            headers={classHeaders}
            rows={classifications.rows}
            onChange={classifications.setRows}
          />
        </div>
      );
    } else {
      return (
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="toolbar">
              <button className="btn" onClick={runValidation}>
                Validate strings
              </button>
              <button className="btn ok" onClick={() => save('strings')}>
                Save strings
              </button>
              <button 
                className="btn secondary" 
                onClick={() => exportCsv('strings')}
              >
                Export strings
              </button>
            </div>
            {validation && (
              <div className="footer">
                {validation.valid ? (
                  <span style={{ color: 'var(--ok)' }}>All rows valid.</span>
                ) : (
                  <div>
                    <div><strong>{validation.invalidIndices.length}</strong> invalid row(s) detected.</div>
                    <ul>
                      {validation.errors.map((e) => (
                        <li key={e.rowIndex}>
                          Row {e.rowIndex + 1}: {e.message} — Topic: <code>{e.fields.Topic}</code>, Subtopic: <code>{e.fields.Subtopic}</code>, Industry: <code>{e.fields.Industry}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <EditableTable
            title="strings"
            headers={stringsHeaders}
            rows={strings.rows}
            onChange={strings.setRows}
            invalidRowIndices={invalidIndices}
          />
        </div>
      );
    }
  };
  return (
    <div className="container" style={{ width: '100%', maxWidth: 'none', padding: '2rem 1rem 1rem' }}>
      <div className="header" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div>
          <div className="title">Knostic CSV Manager</div>
          <div className="sub">
            {activeTab 
              ? `Viewing ${activeTab} data` 
              : 'Upload a CSV file to get started'}
          </div>
        </div>
        <div className="toolbar">
          <label className="btn ghost" style={{ cursor: 'pointer' }}>
            {activeTab ? 'Upload New CSV' : 'Upload CSV'}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0])
              }}
              style={{ display: 'none' }}
            />
          </label>
          {activeTab && (
            <button className="btn secondary" onClick={refresh}>
              Refresh
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.4)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '0 1rem' }}>
        {loading ? (
          <div className="card">Loading...</div>
        ) : activeTab ? (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            {renderTabContent(activeTab)}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', maxWidth: '800px', margin: '2rem auto' }}>
            <p>No data loaded. Please upload a CSV file to begin.</p>
          </div>
        )}
      </div>
    </div>
  )
}
