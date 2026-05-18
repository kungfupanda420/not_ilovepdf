import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const GOTENBERG_URL = process.env.GOTENBERG_URL

if (!GOTENBERG_URL) {
  throw new Error('GOTENBERG_URL environment variable is not defined')
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only DOCX and PPTX files are supported.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer()

    // Create FormData for Gotenberg API
    const gotenbergFormData = new FormData()
    gotenbergFormData.append('files', new Blob([fileBuffer], { type: file.type }), file.name)

    // Determine Gotenberg endpoint based on file type
    const isDocx = file.type.includes('wordprocessingml')
    const isDocx_route = isDocx ? 'libreoffice' : 'libreoffice'
    const endpoint = `${GOTENBERG_URL}/forms/libreoffice/convert`

    // Call Gotenberg API
    const response = await fetch(endpoint, {
      method: 'POST',
      body: gotenbergFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gotenberg error:', errorText)
      return NextResponse.json(
        { error: 'Conversion failed', details: errorText },
        { status: response.status }
      )
    }

    // Get PDF from response
    const pdfBuffer = await response.arrayBuffer()

    // Return PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^.]+$/, '')}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Conversion error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
