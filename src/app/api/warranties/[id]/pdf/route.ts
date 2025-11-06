import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs/promises'
import path from 'path'

// GET /api/warranties/[id]/pdf - สร้าง PDF ใบรับประกันจากภาพ JPG
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('📄 PDF Generation started')

    const session = await getServerSession(authOptions)
    console.log('✓ Session checked')

    if (!session) {
      console.log('❌ Unauthorized - no session')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Await params ใน Next.js 15
    const { id } = await params
    console.log('✓ Warranty ID:', id)

    // ดึงข้อมูลใบรับประกัน
    const warranty = await prisma.warranty.findUnique({
      where: { id },
      include: {
        product: true,
        dealer: true,
        subDealer: true,  // เพิ่ม: ดึงข้อมูลผู้ขายรายย่อย
      },
    })
    console.log('✓ Warranty data fetched')

    if (!warranty) {
      console.log('❌ Warranty not found')
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId !== warranty.dealerId) {
      console.log('❌ Access denied')
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // โหลดภาพ JPG (อ่านจาก Product)
    console.log('📂 Loading JPG background...')
    const templateImage = warranty.product.templateImage || 'Certification-Form.jpg'
    console.log('📋 Template file:', templateImage)
    const imagePath = path.join(process.cwd(), 'public', templateImage)
    console.log('📍 Image path:', imagePath)
    const imageBytes = await fs.readFile(imagePath)
    console.log('✓ Image loaded, size:', imageBytes.length)

    // สร้าง PDF document ใหม่
    console.log('📝 Creating new PDF document...')
    const pdfDoc = await PDFDocument.create()

    // Register fontkit เพื่อรองรับ custom fonts
    pdfDoc.registerFontkit(fontkit)
    console.log('✓ PDF document created with fontkit')

    // ฝังภาพ JPG เข้าไปใน PDF
    console.log('🖼️ Embedding JPG image...')
    const jpgImage = await pdfDoc.embedJpg(imageBytes)
    console.log('✓ JPG image embedded')

    // ดึงขนาดของภาพ
    const { width: imgWidth, height: imgHeight } = jpgImage.scale(1)
    console.log('✓ Image size:', imgWidth, 'x', imgHeight)

    // สร้างหน้า PDF ด้วยขนาดเท่ากับภาพ (A4 standard: 595 x 842)
    const page = pdfDoc.addPage([imgWidth, imgHeight])

    // วางภาพเป็น background
    page.drawImage(jpgImage, {
      x: 0,
      y: 0,
      width: imgWidth,
      height: imgHeight,
    })
    console.log('✓ Background image drawn')

    // โหลด custom font - Prompt (รองรับภาษาไทย)
    console.log('🔤 Embedding Thai fonts...')
    const fontRegularPath = path.join(process.cwd(), 'public', 'fonts', 'Prompt-Regular.ttf')
    const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'Prompt-Bold.ttf')

    const fontRegularBytes = await fs.readFile(fontRegularPath)
    const fontBoldBytes = await fs.readFile(fontBoldPath)

    const font = await pdfDoc.embedFont(fontRegularBytes, { subset: true })
    const fontBold = await pdfDoc.embedFont(fontBoldBytes, { subset: true })
    console.log('✓ Thai fonts embedded (Prompt) with Unicode subset support')

    // โหลดฟอนต์ Standard สำหรับทดสอบ (ไม่ต้อง embed)
    const { StandardFonts } = await import('pdf-lib')
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    console.log('✓ Standard fonts loaded (Helvetica)')

    // ฟังก์ชันช่วยในการ format วันที่
    const formatDate = (dateInput: string | Date | null): string => {
      if (!dateInput) return ''
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }

    console.log('✏️ Writing text to PDF...')
    console.log('📌 Warranty Number:', warranty.warrantyNumber)
    console.log('📌 Dealer Name:', warranty.dealer.dealerName)
    console.log('📌 Customer Name:', warranty.customerName)

    // กำหนดตำแหน่งข้อมูลบน PDF
    // พิกัดที่วัดจาก Canva (1414 x 2000 px)
    // สูตรแปลง: X_PDF = X_Canva, Y_PDF = 2000 - Y_Canva
    const fontSizeLarge = 18      // สำหรับหัวข้อและเลขที่สำคัญ
    const fontSizeMedium = 14     // สำหรับข้อมูลหลัก
    const fontSizeSmall = 12      // สำหรับข้อมูลรอง
    const color = rgb(0, 0, 0)

    // === ส่วนที่ 1: ส่วนบน (Top Section) ===

    // 1. หมายเลขใบรับประกัน - X=283, Y=315
    console.log('✍️ Writing Warranty Number')
    const warrantyNumberText = warranty.warrantyNumber || ''
    console.log('📋 Warranty Number:', warrantyNumberText)

    if (warrantyNumberText) {
      // ไม่ต้องวาดกรอบสีขาว เพราะฟอร์มมีช่องอยู่แล้ว
      // วาดข้อความโดยใช้ Helvetica (เพราะเป็นตัวอักษรภาษาอังกฤษ)
      page.drawText(warrantyNumberText, {
        x: 283,
        y: 2000 - 315,
        size: 18,
        font: helveticaBold,  // ใช้ Helvetica แทน Prompt
        color: rgb(0, 0, 0),  // สีดำ
      })
      console.log('✅ Warranty Number drawn at X=283, Y=1685')
    } else {
      console.log('⚠️ Warranty Number is empty!')
    }

    // 2. ชื่อตัวแทนจำหน่าย (X=840, Y=315)
    // ถ้ามีผู้ขายรายย่อย ให้แสดงชื่อผู้ขายรายย่อยแทน
    const dealerDisplayName = warranty.subDealer?.name || warranty.dealer.dealerName || ''
    console.log('✍️ Dealer Display Name:', dealerDisplayName)
    console.log('   - Sub-Dealer:', warranty.subDealer?.name || 'N/A')
    console.log('   - Main Dealer:', warranty.dealer.dealerName)

    page.drawText(dealerDisplayName, {
      x: 840,
      y: 2000 - 315,
      size: 20,
      font: font,
      color: color,
    })

    // 3. ชื่อลูกค้า (X=350, Y=371)
    page.drawText(warranty.customerName || '', {
      x: 350,
      y: 2000 - 371,
      size: 20,
      font: font,
      color: color,
    })

    // 4. รหัสผู้ผลิต (manufacturerNumber) - X=840, Y=371
    console.log('✍️ Writing Manufacturer Number')
    const manufacturerNumberText = warranty.dealer.manufacturerNumber || ''
    console.log('📋 Manufacturer Number:', manufacturerNumberText)

    if (manufacturerNumberText) {
      // ไม่ต้องวาดกรอบสีขาว เพราะฟอร์มมีช่องอยู่แล้ว
      // วาดข้อความโดยใช้ Helvetica (เพราะเป็นตัวอักษรภาษาอังกฤษ)
      page.drawText(manufacturerNumberText, {
        x: 840,
        y: 2000 - 371,
        size: 18,
        font: helveticaBold,  // ใช้ Helvetica แทน Prompt
        color: rgb(0, 0, 0),  // สีดำ
      })
      console.log('✅ Manufacturer Number drawn at X=840, Y=1629')
    } else {
      console.log('⚠️ Manufacturer Number is empty!')
    }

    // 5. เบอร์โทรลูกค้า (X=315, Y=439)
    page.drawText(warranty.customerPhone || '', {
      x: 315,
      y: 2000 - 439,
      size: 18,
      font: font,
      color: color,
    })

    // 6. ที่อยู่ (X=118-659, Y=472-509) - Text Area แบบหลายบรรทัด
    const address = warranty.customerAddress || ''
    const maxWidth = 541 // ความกว้างของพื้นที่ (659 - 118)
    const addressFontSize = 18
    const lineHeight = 20

    // ฟังก์ชันแบ่งข้อความตามช่องว่าง (ไม่ตัดกลางคำ)
    const wrapText = (text: string, maxWidth: number, fontSize: number, fontToUse: any): string[] => {
      const words = text.split(' ')
      const lines: string[] = []
      let currentLine = ''

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const testWidth = fontToUse.widthOfTextAtSize(testLine, fontSize)

        if (testWidth <= maxWidth) {
          currentLine = testLine
        } else {
          // ถ้าบรรทัดปัจจุบันมีข้อความ ให้บันทึกและเริ่มบรรทัดใหม่
          if (currentLine) {
            lines.push(currentLine)
          }
          currentLine = word
        }
      }

      // เพิ่มบรรทัดสุดท้าย
      if (currentLine) {
        lines.push(currentLine)
      }

      return lines
    }

    // ฟังก์ชันแบ่งข้อความพร้อมรองรับย่อหน้า (สำหรับเงื่อนไขการรับประกัน)
    const wrapTextWithParagraphs = (text: string, maxWidth: number, fontSize: number, fontToUse: any) => {
      // แยกย่อหน้าตาม line break
      const paragraphs = text.split('\n')
      const allLines: { text: string; isParagraphStart: boolean }[] = []

      paragraphs.forEach((paragraph, paraIndex) => {
        if (paragraph.trim() === '') {
          // ถ้าเป็นบรรทัดว่าง ให้เพิ่มบรรทัดว่าง
          allLines.push({ text: '', isParagraphStart: false })
          return
        }

        const words = paragraph.trim().split(' ')
        let currentLine = ''

        words.forEach((word, wordIndex) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const testWidth = fontToUse.widthOfTextAtSize(testLine, fontSize)

          if (testWidth <= maxWidth) {
            currentLine = testLine
          } else {
            if (currentLine) {
              allLines.push({
                text: currentLine,
                isParagraphStart: wordIndex === 0 && paraIndex > 0
              })
            }
            currentLine = word
          }
        })

        // เพิ่มบรรทัดสุดท้ายของย่อหน้า
        if (currentLine) {
          allLines.push({
            text: currentLine,
            isParagraphStart: paraIndex > 0 && allLines.length === 0
          })
        }
      })

      return allLines
    }

    const addressLines = wrapText(address, maxWidth, addressFontSize, font)

    // แสดงที่อยู่สูงสุด 2 บรรทัด
    addressLines.slice(0, 2).forEach((line, index) => {
      page.drawText(line, {
        x: 118,
        y: 2000 - 472 - (index * lineHeight),
        size: addressFontSize,
        font: font,
        color: color,
      })
    })

    // 7. วันที่ผลิต (X=840, Y=439)
    page.drawText(formatDate(warranty.productionDate), {
      x: 840,
      y: 2000 - 439,
      size: 18,
      font: font,
      color: color,
    })

    // 8. วันที่ส่งมอบ (X=840, Y=509)
    page.drawText(formatDate(warranty.deliveryDate), {
      x: 840,
      y: 2000 - 509,
      size: 18,
      font: font,
      color: color,
    })

    // 9. เลขที่ใบสั่งซื้อ (X=283, Y=575)
    page.drawText(warranty.purchaseOrderNo || '', {
      x: 283,
      y: 2000 - 575,
      size: 18,
      font: font,
      color: color,
    })

    // 10. สินค้า (X=840, Y=575)
    page.drawText(warranty.product.productName || '', {
      x: 840,
      y: 2000 - 575,
      size: 20,
      font: font,
      color: color,
    })

    // 11. พื้นที่ติดตั้งฉนวน (X=500, Y=629)
    page.drawText(warranty.installationArea ? `${warranty.installationArea}` : '', {
      x: 500,
      y: 2000 - 629,
      size: 18,
      font: font,
      color: color,
    })

    // 12. ความหนา (X=980, Y=629)
    page.drawText(warranty.thickness ? `${warranty.thickness}` : '', {
      x: 980,
      y: 2000 - 629,
      size: 18,
      font: font,
      color: color,
    })

    // 13. เงื่อนไขการรับประกัน (X=94-1334, Y=838-1200) - Text Area
    const warrantyTermsText = warranty.warrantyTerms || ''
    const warrantyTermsMaxWidth = 1240  // maxWidth (1334 - 94)
    const warrantyTermsMaxHeight = 362  // maxHeight (1200 - 838)
    const warrantyTermsFontSize = 16    // ขนาดฟอนต์ 16 (ลดจาก 18 เพื่อให้พอดีกับพื้นที่)
    const warrantyTermsLineHeight = 24  // ระยะห่างบรรทัด 1.5x font size (24 = 16 * 1.5)
    const warrantyTermsParagraphSpacing = 8  // ระยะห่างระหว่างย่อหน้า

    // ใช้ wrapTextWithParagraphs เพื่อแบ่งข้อความพร้อมรองรับย่อหน้า
    const warrantyTermsLinesWithMeta = wrapTextWithParagraphs(
      warrantyTermsText,
      warrantyTermsMaxWidth,
      warrantyTermsFontSize,
      font
    )

    // คำนวณจำนวนบรรทัดที่แสดงได้ตาม maxHeight
    const maxLines = Math.floor(warrantyTermsMaxHeight / warrantyTermsLineHeight)

    // วาดข้อความทีละบรรทัด พร้อมเว้นระยะย่อหน้า
    let currentY = 2000 - 838
    warrantyTermsLinesWithMeta.slice(0, maxLines).forEach((lineObj, index) => {
      // เพิ่มระยะห่างพิเศษถ้าเป็นจุดเริ่มต้นย่อหน้าใหม่
      if (lineObj.isParagraphStart && index > 0) {
        currentY -= warrantyTermsParagraphSpacing
      }

      page.drawText(lineObj.text, {
        x: 94,
        y: currentY,
        size: warrantyTermsFontSize,
        font: font,
        color: color,
      })

      // ลด Y สำหรับบรรทัดถัดไป
      currentY -= warrantyTermsLineHeight
    })

    // === ส่วนที่ 2: ส่วนล่าง (Bottom Section - Carbon Copy) ===
    // *** ไม่แสดงข้อมูลข้อ 14-25 ในการ Print เพราะเป็นส่วนที่ส่งคืนสำนักงานใหญ่ ***
    // *** ข้อมูลจะแสดงเฉพาะในโปรแกรมเท่านั้น ***

    /*
    // 14. หมายเลขใบรับประกัน (Carbon Copy) - X=283, Y=1577
    console.log('✍️ Writing Warranty Number (Carbon Copy)')
    if (warrantyNumberText) {
      // ไม่ต้องวาดกรอบสีขาว เพราะฟอร์มมีช่องอยู่แล้ว
      // วาดข้อความโดยใช้ Helvetica (เพราะเป็นตัวอักษรภาษาอังกฤษ)
      page.drawText(warrantyNumberText, {
        x: 283,
        y: 2000 - 1577,
        size: 18,
        font: helveticaBold,  // ใช้ Helvetica แทน Prompt
        color: rgb(0, 0, 0),  // สีดำ
      })
      console.log('✅ Warranty Number (Carbon Copy) drawn at X=283, Y=423')
    }

    // 15. ชื่อตัวแทนจำหน่าย (Carbon Copy) (X=840, Y=1577)
    // ถ้ามีผู้ขายรายย่อย ให้แสดงชื่อผู้ขายรายย่อยแทน (ใช้ dealerDisplayName เดียวกัน)
    page.drawText(dealerDisplayName, {
      x: 840,
      y: 2000 - 1577,
      size: 20,
      font: font,
      color: color,
    })

    // 16. ชื่อลูกค้า (X=350, Y=1634)
    page.drawText(warranty.customerName || '', {
      x: 350,
      y: 2000 - 1634,
      size: 20,
      font: font,
      color: color,
    })

    // 17. รหัสผู้ผลิต (manufacturerNumber) - Carbon Copy X=840, Y=1634
    console.log('✍️ Writing Manufacturer Number (Carbon Copy)')
    if (manufacturerNumberText) {
      // ไม่ต้องวาดกรอบสีขาว เพราะฟอร์มมีช่องอยู่แล้ว
      // วาดข้อความโดยใช้ Helvetica (เพราะเป็นตัวอักษรภาษาอังกฤษ)
      page.drawText(manufacturerNumberText, {
        x: 840,
        y: 2000 - 1634,
        size: 18,
        font: helveticaBold,  // ใช้ Helvetica แทน Prompt
        color: rgb(0, 0, 0),  // สีดำ
      })
      console.log('✅ Manufacturer Number (Carbon Copy) drawn at X=840, Y=366')
    }

    // 18. เบอร์โทรลูกค้า (X=311, Y=1709)
    page.drawText(warranty.customerPhone || '', {
      x: 311,
      y: 2000 - 1709,
      size: 18,
      font: font,
      color: color,
    })

    // 19. ที่อยู่ (X=118-659, Y=1736-1780) - Text Area แบบหลายบรรทัด (Carbon Copy)
    const address2 = warranty.customerAddress || ''
    const maxWidth2 = 541 // ความกว้างของพื้นที่ (659 - 118)
    const address2FontSize = 18
    const lineHeight2 = 22

    // ใช้ฟังก์ชัน wrapText เดียวกับส่วนบน (ตัดที่ช่องว่าง ไม่ตัดกลางคำ)
    const address2Lines = wrapText(address2, maxWidth2, address2FontSize, font)

    // แสดงที่อยู่สูงสุด 2 บรรทัด
    address2Lines.slice(0, 2).forEach((line, index) => {
      page.drawText(line, {
        x: 118,
        y: 2000 - 1736 - (index * lineHeight2),
        size: address2FontSize,
        font: font,
        color: color,
      })
    })

    // 20. วันที่ผลิต (X=840, Y=1709)
    page.drawText(formatDate(warranty.productionDate), {
      x: 840,
      y: 2000 - 1709,
      size: 18,
      font: font,
      color: color,
    })

    // 21. วันที่ส่งมอบ (X=840, Y=1772)
    page.drawText(formatDate(warranty.deliveryDate), {
      x: 840,
      y: 2000 - 1772,
      size: 18,
      font: font,
      color: color,
    })

    // 22. เลขที่ใบสั่งซื้อ (X=283, Y=1838)
    page.drawText(warranty.purchaseOrderNo || '', {
      x: 283,
      y: 2000 - 1838,
      size: 18,
      font: font,
      color: color,
    })

    // 23. หมายเลข Batch สารเคมี (X=979, Y=1838)
    // ปรับขนาดฟอนต์แบบ Dynamic ตามความยาวของ Batch Number
    const chemicalBatchNoText = warranty.chemicalBatchNo || ''
    const batchLength = chemicalBatchNoText.length

    // กำหนดขนาดฟอนต์ตามความยาว
    let batchFontSize = 20  // ค่าเริ่มต้น
    if (batchLength > 45) {
      batchFontSize = 14  // ลดมาก สำหรับ 3+ batches
    } else if (batchLength > 30) {
      batchFontSize = 16  // ลดปานกลาง สำหรับ 2-3 batches
    }
    // else ใช้ 20 (ปกติ) สำหรับ 1 batch

    console.log(`📋 Chemical Batch No: "${chemicalBatchNoText}"`)
    console.log(`   Length: ${batchLength} chars, Font size: ${batchFontSize}`)

    page.drawText(chemicalBatchNoText, {
      x: 979,
      y: 2000 - 1838,
      size: batchFontSize,
      font: font,
      color: color,
    })

    // 24. พื้นที่ติดตั้งฉนวน (X=311, Y=1889)
    page.drawText(warranty.installationArea ? `${warranty.installationArea}` : '', {
      x: 311,
      y: 2000 - 1889,
      size: 18,
      font: font,
      color: color,
    })

    // 25. ความหนา (X=840, Y=1889)
    page.drawText(warranty.thickness ? `${warranty.thickness}` : '', {
      x: 840,
      y: 2000 - 1889,
      size: 18,
      font: font,
      color: color,
    })
    */

    console.log('ℹ️ Carbon Copy section (ข้อ 14-25) is disabled for printing')

    console.log('✓ All text written')

    // บันทึก PDF
    console.log('💾 Saving PDF...')
    const pdfBytes = await pdfDoc.save()
    console.log('✓ PDF saved, size:', pdfBytes.length)

    // ส่ง PDF กลับไปให้ client
    console.log('✅ Sending PDF to client')
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="warranty-${warranty.warrantyNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('❌ Error generating PDF:', error)
    // Log รายละเอียด error เพื่อ debug
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
