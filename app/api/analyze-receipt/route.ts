import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const image = formData.get('image') as File
    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 })

    const bytes = await image.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = image.type

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: { mime_type: mimeType, data: base64 }
              },
              {
                text: `Analiza esta boleta, comprobante o correo bancario y extrae la información.
                Responde SOLO con un JSON válido sin texto adicional ni comillas de código:
                {
                  "type": "gasto" o "ingreso",
                  "description": "nombre del comercio o descripción corta",
                  "amount": número sin puntos ni comas,
                  "date": "YYYY-MM-DD o null si no se ve",
                  "categoria_sugerida": "Alimentación, Transporte, Salud, Servicios, Entretenimiento, Ropa, Educación, Hogar u Otro"
                }`
              }
            ]
          }]
        })
      }
    )

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Error analizando imagen' }, { status: 500 })
  }
}