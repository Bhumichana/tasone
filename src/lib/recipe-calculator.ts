/**
 * Recipe Calculator - คำนวณวัตถุดิบจากสูตรการผลิต (Multi-Batch FIFO Support)
 */

/**
 * Batch Allocation - ข้อมูลการจัดสรร batch แต่ละตัว
 */
export interface BatchAllocation {
  batchId: string // ID ของ DealerStock
  batchNumber: string // เลข batch
  quantityUsed: number // ปริมาณที่ใช้จาก batch นี้
  batchStock: number // สต็อกเดิมของ batch นี้ก่อนตัด
  createdAt: string | Date // วันที่รับเข้า batch นี้
}

/**
 * Material Usage Item - ข้อมูลการใช้วัตถุดิบ (รองรับหลาย batch)
 */
export interface MaterialUsageItem {
  rawMaterialId: string
  materialCode: string
  materialName: string
  materialType: string
  quantityPerUnit: number // ปริมาณต่อ 1 หน่วย (ตร.ม.)
  totalQuantity: number // ปริมาณรวมที่ต้องใช้
  unit: string
  batches: BatchAllocation[] // รายการ batch ที่ใช้ (Multi-Batch FIFO)
  batchNumber: string // Batch Numbers รวมกัน (สำหรับแสดงผล) เช่น "BATCH001, BATCH002"
  totalAvailableStock: number // สต็อกรวมที่มีอยู่ทั้งหมด
  isStockSufficient: boolean // สต็อกเพียงพอหรือไม่
}

export interface ProductRecipeWithItems {
  id: string
  recipeName: string
  calculationUnit: string
  items: {
    id: string
    quantity: number
    unit: string
    rawMaterialId: string
    rawMaterial: {
      id: string
      materialCode: string
      materialName: string
      materialType: string
      unit: string
      currentStock: number
    }
  }[]
}

/**
 * DealerStock item interface
 */
export interface DealerStockItem {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  batchNumber: string
  currentStock: number
  unit: string
  createdAt: string | Date // วันที่รับเข้า (สำหรับ FIFO)
}

/**
 * คำนวณวัตถุดิบที่ต้องใช้จากสูตรและพื้นที่ติดตั้ง (ใช้ RawMaterial Stock - เก่า)
 *
 * @param recipe - สูตรการผลิต
 * @param installationArea - พื้นที่ติดตั้ง (ตารางเมตร)
 * @returns รายการวัตถุดิบที่ต้องใช้พร้อมข้อมูลสต็อก
 * @deprecated ใช้ calculateMaterialUsageFromDealerStock แทน
 */
export function calculateMaterialUsage(
  recipe: ProductRecipeWithItems,
  installationArea: number
): MaterialUsageItem[] {
  // ถ้าสูตรไม่ใช่แบบต่อตารางเมตร หรือไม่มีพื้นที่ ให้ return []
  if (recipe.calculationUnit !== 'PER_SQM' || !installationArea || installationArea <= 0) {
    return []
  }

  return recipe.items.map(item => {
    const totalQuantity = item.quantity * installationArea

    return {
      rawMaterialId: item.rawMaterialId,
      materialCode: item.rawMaterial.materialCode,
      materialName: item.rawMaterial.materialName,
      materialType: item.rawMaterial.materialType,
      quantityPerUnit: item.quantity,
      totalQuantity: totalQuantity,
      unit: item.unit,
      batches: [], // ไม่มี batch allocation ในฟังก์ชันเก่า
      batchNumber: '', // ไม่มี batch number ในฟังก์ชันเก่า
      totalAvailableStock: item.rawMaterial.currentStock,
      isStockSufficient: item.rawMaterial.currentStock >= totalQuantity
    }
  })
}

/**
 * คำนวณวัตถุดิบที่ต้องใช้จากสูตรและพื้นที่ติดตั้ง (ใช้ DealerStock)
 * Multi-Batch FIFO Allocation - แบ่งการใช้งานไปหลาย batch ตาม FIFO
 *
 * @param recipe - สูตรการผลิต
 * @param installationArea - พื้นที่ติดตั้ง (ตารางเมตร)
 * @param dealerStocks - สต็อกทั้งหมดของดีลเลอร์
 * @returns รายการวัตถุดิบที่ต้องใช้พร้อมการจัดสรร batch แบบ FIFO
 */
export function calculateMaterialUsageFromDealerStock(
  recipe: ProductRecipeWithItems,
  installationArea: number,
  dealerStocks: DealerStockItem[]
): MaterialUsageItem[] {
  // ถ้าสูตรไม่ใช่แบบต่อตารางเมตร หรือไม่มีพื้นที่ ให้ return []
  if (recipe.calculationUnit !== 'PER_SQM' || !installationArea || installationArea <= 0) {
    return []
  }

  return recipe.items.map(item => {
    const totalQuantity = item.quantity * installationArea
    const materialCode = item.rawMaterial.materialCode

    // ค้นหา batch ทั้งหมดของวัตถุดิบนี้
    const availableBatches = dealerStocks.filter(
      stock => stock.materialCode === materialCode && stock.currentStock > 0
    )

    // เรียง batch ตามวันที่รับเข้า FIFO (First In First Out) - เก่าสุดก่อน
    availableBatches.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    // คำนวณการจัดสรร batch ตาม FIFO
    const batchAllocations: BatchAllocation[] = []
    let remainingQuantity = totalQuantity

    for (const batch of availableBatches) {
      if (remainingQuantity <= 0) break

      // ใช้ได้เท่าที่มีในสต็อก หรือเท่าที่ต้องการ (เลือกอันน้อยกว่า)
      const quantityToUse = Math.min(remainingQuantity, batch.currentStock)

      batchAllocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantityUsed: quantityToUse,
        batchStock: batch.currentStock,
        createdAt: batch.createdAt
      })

      remainingQuantity -= quantityToUse
    }

    // คำนวณสต็อกรวมที่มีอยู่ทั้งหมด
    const totalAvailableStock = availableBatches.reduce((sum, batch) => sum + batch.currentStock, 0)

    // สร้าง batch number string รวมกัน (สำหรับแสดงผล)
    const batchNumberString = batchAllocations.map(b => b.batchNumber).join(', ')

    return {
      rawMaterialId: item.rawMaterialId,
      materialCode: materialCode,
      materialName: item.rawMaterial.materialName,
      materialType: item.rawMaterial.materialType,
      quantityPerUnit: item.quantity,
      totalQuantity: totalQuantity,
      unit: item.unit,
      batches: batchAllocations,
      batchNumber: batchNumberString,
      totalAvailableStock: totalAvailableStock,
      isStockSufficient: totalAvailableStock >= totalQuantity
    }
  })
}

/**
 * ตรวจสอบว่าสต็อกเพียงพอหรือไม่
 *
 * @param materialUsage - รายการวัตถุดิบที่คำนวณแล้ว
 * @returns true ถ้าสต็อกเพียงพอทั้งหมด
 */
export function isStockSufficient(materialUsage: MaterialUsageItem[]): boolean {
  return materialUsage.every(item => item.isStockSufficient)
}

/**
 * สร้าง JSON string สำหรับบันทึกใน database
 *
 * @param materialUsage - รายการวัตถุดิบที่คำนวณแล้ว
 * @returns JSON string
 */
export function serializeMaterialUsage(materialUsage: MaterialUsageItem[]): string {
  return JSON.stringify(materialUsage, null, 2)
}

/**
 * แปลง JSON string กลับเป็น MaterialUsageItem[]
 *
 * @param json - JSON string จาก database
 * @returns รายการวัตถุดิบ
 */
export function deserializeMaterialUsage(json: string | null): MaterialUsageItem[] | null {
  if (!json) return null

  try {
    return JSON.parse(json) as MaterialUsageItem[]
  } catch (error) {
    console.error('Error parsing material usage JSON:', error)
    return null
  }
}
