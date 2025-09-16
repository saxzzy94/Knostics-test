import React from 'react'
export type EditableTableProps = {
  title?: string
  headers: string[]
  rows: string[][]
  onChange: (rows: string[][]) => void
  invalidRowIndices?: number[]
}
export function EditableTable({ title, headers, rows, onChange, invalidRowIndices = [] }: EditableTableProps) {
  const invalidSet = React.useMemo(() => new Set(invalidRowIndices), [invalidRowIndices])
  const setCell = (r: number, c: number, value: string) => {
    const next = rows.map((row, i) => (i === r ? row.map((v, j) => (j === c ? value : v)) : row))
    onChange(next)
  }
  const addRow = () => {
    const empty = headers.map(() => '')
    onChange([...rows, empty])
  }
  const deleteRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index)
    onChange(next)
  }
  return (
    <div className="editable-table">
      <div className="header">
        {title && <h3 className="title">{title}</h3>}
        <div className="toolbar">
          <button 
            className="btn" 
            onClick={addRow}
            style={{ whiteSpace: 'nowrap' }}
          >
            + Add Row
          </button>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>
                  <div style={{ 
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    color: 'var(--muted)'
                  }}>
                    {h}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr 
                key={r} 
                className={invalidSet.has(r) ? 'invalid' : ''}
                style={{
                  display: 'table-row',
                  borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                {row.map((cell, c) => (
                  <td 
                    key={c} 
                    data-label={headers[c]}
                    style={{
                      padding: '8px 12px',
                      verticalAlign: 'middle',
                      position: 'relative'
                    }}
                  >
                    <input
                      className="cell"
                      type="text"
                      value={cell}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        minHeight: '36px',
                        fontSize: '0.9rem',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'var(--fg)'
                      }}
                      aria-label={headers[c]}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
export default EditableTable
