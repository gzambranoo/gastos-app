import * as XLSX from 'xlsx'

export function exportToExcel(transactions: any[]) {
  const rows = transactions.map(tx => ({
    'Fecha': tx.date,
    'Tipo': tx.type,
    'Descripción': tx.description,
    'Monto': tx.amount,
    'Categoría': tx.categories?.name || '',
    'Subcategoría': '',
    'Medio de pago': tx.payment_methods?.name || '',
    'Es fijo': tx.is_fixed ? 'SI' : 'NO',
    'Cuotas': tx.installments_total || '',
    'Monto cuota': tx.installment_amount || '',
    'Notas': tx.notes || '',
  }))

  const instrucciones = [
    { 'Campo': 'Fecha', 'Formato': 'YYYY-MM-DD', 'Ejemplo': '2026-05-15' },
    { 'Campo': 'Tipo', 'Formato': 'gasto o ingreso', 'Ejemplo': 'gasto' },
    { 'Campo': 'Descripción', 'Formato': 'Texto libre', 'Ejemplo': 'Supermercado Lider' },
    { 'Campo': 'Monto', 'Formato': 'Número sin puntos', 'Ejemplo': '15000' },
    { 'Campo': 'Categoría', 'Formato': 'Nombre exacto de tu categoría', 'Ejemplo': 'Alimentación' },
    { 'Campo': 'Subcategoría', 'Formato': 'Opcional', 'Ejemplo': 'Supermercado' },
    { 'Campo': 'Medio de pago', 'Formato': 'Nombre exacto de tu medio', 'Ejemplo': 'Visa BCI' },
    { 'Campo': 'Es fijo', 'Formato': 'SI o NO', 'Ejemplo': 'NO' },
    { 'Campo': 'Cuotas', 'Formato': 'Número o vacío', 'Ejemplo': '12' },
    { 'Campo': 'Monto cuota', 'Formato': 'Número o vacío', 'Ejemplo': '5000' },
    { 'Campo': 'Notas', 'Formato': 'Texto libre opcional', 'Ejemplo': 'Compra mensual' },
  ]

  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [rows[0] || {}])
  const ws2 = XLSX.utils.json_to_sheet(instrucciones)

  XLSX.utils.book_append_sheet(wb, ws1, 'Transacciones')
  XLSX.utils.book_append_sheet(wb, ws2, 'Instrucciones')

  XLSX.writeFile(wb, `gastos_${new Date().toISOString().split('T')[0]}.xlsx`)
}