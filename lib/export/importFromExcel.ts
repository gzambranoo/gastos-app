import * as XLSX from 'xlsx'

export type ImportRow = {
  fecha: string
  tipo: 'gasto' | 'ingreso'
  descripcion: string
  monto: number
  categoria: string
  subcategoria: string
  medioPago: string
  esFijo: boolean
  cuotas: number | null
  montoCuota: number | null
  notas: string
  error?: string
}

export function parseExcel(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets['Transacciones']
        if (!ws) { reject('No se encontró la hoja Transacciones'); return }

        const rows = XLSX.utils.sheet_to_json(ws) as any[]
        const parsed: ImportRow[] = rows.map((row, i) => {
          const errors: string[] = []
          const fecha = row['Fecha']?.toString() || ''
          const tipo = row['Tipo']?.toString().toLowerCase()
          const monto = parseFloat(row['Monto']?.toString() || '0')

          if (!fecha) errors.push('Fecha requerida')
          if (tipo !== 'gasto' && tipo !== 'ingreso') errors.push('Tipo debe ser gasto o ingreso')
          if (!row['Descripción']) errors.push('Descripción requerida')
          if (isNaN(monto) || monto <= 0) errors.push('Monto inválido')

          return {
            fecha,
            tipo: tipo === 'ingreso' ? 'ingreso' : 'gasto',
            descripcion: row['Descripción']?.toString() || '',
            monto,
            categoria: row['Categoría']?.toString() || '',
            subcategoria: row['Subcategoría']?.toString() || '',
            medioPago: row['Medio de pago']?.toString() || '',
            esFijo: row['Es fijo']?.toString().toUpperCase() === 'SI',
            cuotas: row['Cuotas'] ? parseInt(row['Cuotas']) : null,
            montoCuota: row['Monto cuota'] ? parseFloat(row['Monto cuota']) : null,
            notas: row['Notas']?.toString() || '',
            error: errors.length > 0 ? errors.join(', ') : undefined,
          }
        })
        resolve(parsed)
      } catch (err) {
        reject('Error leyendo el archivo')
      }
    }
    reader.readAsArrayBuffer(file)
  })
}