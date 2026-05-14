'use client'

import { useState, useCallback } from 'react'
import { type Account } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { autoCategorize } from '@/lib/utils/categorize'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import Papa from 'papaparse'

interface CSVImportModalProps {
  account: Account
  onSuccess?: () => void
}

interface ParsedRow {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  currency: 'MXN' | 'USD'
  category: string
  budget_category: string
}

export function CSVImportModal({ account, onSuccess }: CSVImportModalProps) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState('')
  const supabase = createClient()

  function parseCSV(file: File) {
    setFileName(file.name)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed: ParsedRow[] = []

        for (const row of result.data as Record<string, string>[]) {
          // Detect ARQ format
          const isARQ = 'Monto' in row || 'monto' in row || 'Fecha' in row

          // Detect Edenred format
          const isEdenred = 'Importe' in row || 'importe' in row

          // Generic format
          let date = row['date'] || row['fecha'] || row['Fecha'] || row['Date'] || ''
          let amountStr = row['amount'] || row['monto'] || row['Monto'] || row['importe'] || row['Importe'] || row['Amount'] || '0'
          let description = row['description'] || row['descripcion'] || row['Descripción'] || row['concepto'] || row['Concepto'] || row['Description'] || ''
          let typeStr = row['type'] || row['tipo'] || row['Tipo'] || 'expense'
          let currencyStr = row['currency'] || row['moneda'] || row['Moneda'] || (account.currency || 'MXN')

          // Normalize amount (remove $, commas, spaces)
          amountStr = amountStr.replace(/[$,\s]/g, '')
          const amount = Math.abs(parseFloat(amountStr) || 0)
          if (amount === 0) continue

          // Determine type from amount sign or column
          const rawAmount = parseFloat(amountStr.replace(/[$,\s]/g, ''))
          const isCredit = rawAmount > 0 || typeStr.toLowerCase().includes('abono') || typeStr.toLowerCase().includes('ingreso') || typeStr.toLowerCase().includes('credit')
          const type: 'income' | 'expense' = isCredit ? 'income' : 'expense'

          // Normalize date
          if (date) {
            try {
              const d = new Date(date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'))
              date = d.toISOString().split('T')[0]
            } catch {}
          }

          const budget_category = autoCategorize(description) || (type === 'income' ? 'income' : 'need')

          parsed.push({
            date: date || new Date().toISOString().split('T')[0],
            description,
            amount,
            type,
            currency: currencyStr.toUpperCase() as 'MXN' | 'USD',
            category: description,
            budget_category,
          })
        }

        setRows(parsed)
      },
      error: (err) => toast.error('Error al leer el CSV: ' + err.message),
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) parseCSV(file)
    else toast.error('Solo se admiten archivos .csv')
  }, [])

  async function handleImport() {
    if (rows.length === 0) return
    setImporting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const records = rows.map(row => ({
        user_id: user.id,
        account_id: account.id,
        type: row.type,
        amount: row.amount,
        currency: row.currency,
        amount_mxn: row.currency === 'USD' ? row.amount * 17.5 : row.amount,
        exchange_rate: row.currency === 'USD' ? 17.5 : 1,
        category: row.category,
        budget_category: row.budget_category,
        description: row.description,
        date: row.date,
        source: 'csv_import' as const,
        is_salary: false,
        is_internal_transfer: false,
      }))

      const CHUNK = 50
      let total = 0
      for (let i = 0; i < records.length; i += CHUNK) {
        const chunk = records.slice(i, i + CHUNK)
        const { error } = await supabase.from('transactions').upsert(chunk, { ignoreDuplicates: false })
        if (error) throw error
        total += chunk.length
      }

      toast.success(`${total} transacciones importadas de ${account.name}`)
      setRows([])
      setFileName('')
      setOpen(false)
      onSuccess?.()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <Upload className="w-3.5 h-3.5" /> Importar CSV
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar CSV — {account.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => e.target.files?.[0] && parseCSV(e.target.files[0])}
            />
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Arrastra tu CSV aquí o haz clic</p>
            <p className="text-xs text-muted-foreground mt-1">
              Compatible con CSV de {account.name}, formato general
            </p>
          </div>

          {/* Preview */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{fileName}</span>
                <Badge variant="secondary">{rows.length} transacciones</Badge>
              </div>

              <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Fecha</th>
                      <th className="px-3 py-2 text-left font-medium">Descripción</th>
                      <th className="px-3 py-2 text-right font-medium">Monto</th>
                      <th className="px-3 py-2 text-center font-medium">Cat.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.slice(0, 20).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.date}</td>
                        <td className="px-3 py-1.5 truncate max-w-[150px]">{row.description}</td>
                        <td className={`px-3 py-1.5 text-right font-medium ${row.type === 'income' ? 'text-blue-600' : ''}`}>
                          {row.type === 'income' ? '+' : '-'}${row.amount.toFixed(2)}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <Badge variant="outline" className="text-[10px]">{row.budget_category}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground bg-muted text-center">
                    ... y {rows.length - 20} más
                  </div>
                )}
              </div>

              <Button onClick={handleImport} className="w-full gap-2" disabled={importing}>
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Importar {rows.length} transacciones
              </Button>
            </div>
          )}

          {/* Help */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="font-medium">¿Cómo exportar el CSV?</p>
            {account.type === 'arq' && (
              <p>En la app ARQ → Historial → Exportar → CSV</p>
            )}
            {account.type === 'edenred' && (
              <p>En el portal Edenred Wallet → Mis movimientos → Descargar</p>
            )}
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </>
  )
}
